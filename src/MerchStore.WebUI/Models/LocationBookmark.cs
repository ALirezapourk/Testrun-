using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace MerchStore.WebUI.Models;

[Table("location_bookmarks")]
public class LocationBookmark : BaseModel
{
    [PrimaryKey("id", false)]
    public long Id { get; set; }
    
    [Column("user_id")]
    public string UserId { get; set; } = string.Empty;
    
    [Column("name")]
    public string Name { get; set; } = string.Empty;
    
    [Column("notes")]
    public string? Notes { get; set; }
    
    [Column("lat")]
    public double Lat { get; set; }
    
    [Column("lng")]
    public double Lng { get; set; }
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}
