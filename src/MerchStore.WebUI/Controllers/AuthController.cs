using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Supabase;

public class AuthController : Controller
{
    private readonly Supabase.Client _supabase;

    public AuthController(Supabase.Client supabase) => _supabase = supabase;

    [HttpGet("/auth/login")]
    public async Task<IActionResult> Login()
    {
        var redirectTo = $"{Request.Scheme}://{Request.Host}/auth/callback";

        var state = await _supabase.Auth.SignIn(
            Supabase.Gotrue.Constants.Provider.Discord, // ✅ correct enum path
            new Supabase.Gotrue.SignInOptions
            {
                FlowType  = Supabase.Gotrue.Constants.OAuthFlowType.PKCE, // ✅ set PKCE here
                RedirectTo = redirectTo
            });

        // store PKCE verifier for the callback exchange
        HttpContext.Session.SetString("pkce_verifier", state.PKCEVerifier);

        return Redirect(state.Uri.ToString());
    }

    [HttpGet("/auth/callback")]
    public async Task<IActionResult> Callback([FromQuery] string? code, [FromQuery] string? error)
    {
        if (!string.IsNullOrEmpty(error))
            return Redirect($"/login?error={Uri.EscapeDataString(error)}");
        if (string.IsNullOrEmpty(code))
            return BadRequest("Missing 'code'.");

        var verifier = HttpContext.Session.GetString("pkce_verifier");
        if (string.IsNullOrEmpty(verifier))
            return BadRequest("Missing PKCE verifier.");

        // ✅ C# signature is (codeVerifier, authCode)
        var session = await _supabase.Auth.ExchangeCodeForSession(verifier, code);

        if (session?.User == null)
            return Redirect("/login?error=signin_failed");

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, session.User.Id.ToString()),
            new Claim(ClaimTypes.Name, session.User.UserMetadata?.GetValueOrDefault("name")?.ToString() ?? "DiscordUser"),
            new Claim(ClaimTypes.Email, session.User.Email ?? string.Empty),
            new Claim("sb_access_token", session.AccessToken ?? string.Empty),
            new Claim("sb_refresh_token", session.RefreshToken ?? string.Empty)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));

        return Redirect("/");
    }

    [HttpPost("/auth/logout")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await _supabase.Auth.SignOut();
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Redirect("/");
    }
}
