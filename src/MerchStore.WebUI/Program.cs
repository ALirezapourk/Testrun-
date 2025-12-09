using DotNetEnv;
using MerchStore.WebUI.Options;
using Supabase;
using Microsoft.AspNetCore.Authentication.Cookies;

var builder = WebApplication.CreateBuilder(args);

// =======================
// LOAD ENV VARIABLES 🌍
// =======================
Env.Load();  

var googleMapsApiKey = Environment.GetEnvironmentVariable("GOOGLE_MAPS_API_KEY");
var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
var supabaseAnonKey = Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY");

// Debug prints (you can remove later)
Console.WriteLine($"SUPABASE_URL: {supabaseUrl}");
Console.WriteLine($"SUPABASE_ANON_KEY: {supabaseAnonKey}");
Console.WriteLine($"GOOGLE_MAPS_API_KEY: {googleMapsApiKey}");

// Validate required env vars
if (string.IsNullOrWhiteSpace(supabaseUrl) || string.IsNullOrWhiteSpace(supabaseAnonKey))
{
    throw new InvalidOperationException("Supabase URL or Anon Key is not set.");
}


// ==========================
// GOOGLE MAPS OPTIONS 🗺️
// ==========================
builder.Services.Configure<GoogleMapsOptions>(options =>
{
    options.ApiKey = googleMapsApiKey ?? string.Empty;
});


// ========================
// SUPABASE CONFIG 🔥
// ========================
var supabaseOptions = new SupabaseOptions
{
    AutoRefreshToken = true,
    AutoConnectRealtime = true
};

var supabaseClient = new Supabase.Client(
    supabaseUrl,
    supabaseAnonKey,
    supabaseOptions
);

await supabaseClient.InitializeAsync();

// Register Supabase client
builder.Services.AddSingleton<Supabase.Client>(supabaseClient);


// ========================
// AUTH & SESSION 🔐
// ========================
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.LoginPath = "/auth/login";
        o.LogoutPath = "/auth/logout";
        o.SlidingExpiration = true;
    });

builder.Services.AddSession();


// ========================
// MVC
// ========================
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

var app = builder.Build();


// ========================
// PIPELINE ⚙️
// ========================
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

// Custom 404
app.UseStatusCodePagesWithReExecute("/Error/Error404");

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseSession();
app.UseAuthentication();
app.UseAuthorization();


// ========================
// ROUTES 🚦
// ========================
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
