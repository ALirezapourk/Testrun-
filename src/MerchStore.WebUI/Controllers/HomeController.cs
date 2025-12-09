using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MerchStore.WebUI.Models;
using Microsoft.Extensions.Options;
using MerchStore.WebUI.Options;

namespace MerchStore.WebUI.Controllers;
public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly GoogleMapsOptions _googleMapsOptions;

    public HomeController(
        ILogger<HomeController> logger,
        IOptions<GoogleMapsOptions> googleMapsOptions)
    {
        _logger = logger;
        _googleMapsOptions = googleMapsOptions.Value;
    }

    public IActionResult Index()
    {
        ViewData["GoogleMapsApiKey"] = _googleMapsOptions.ApiKey;
        return View();
    }
    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
