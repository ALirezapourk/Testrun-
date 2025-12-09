namespace MerchStore.WebUI.Models;

public class UpdateBookmarkRequest
{
    public required string Name { get; set; }
    public string? Notes { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
}
