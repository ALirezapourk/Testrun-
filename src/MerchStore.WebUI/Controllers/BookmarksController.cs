using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MerchStore.WebUI.Models;
using Supabase;
using System.Security.Claims;

namespace MerchStore.WebUI.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class BookmarksController : ControllerBase
{
    private readonly Supabase.Client _supabase;
    private readonly ILogger<BookmarksController> _logger;

    public BookmarksController(Supabase.Client supabase, ILogger<BookmarksController> logger)
    {
        _supabase = supabase;
        _logger = logger;
    }

    // GET: api/bookmarks
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LocationBookmarkDto>>> GetBookmarks()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
            var response = await _supabase
                .From<LocationBookmark>()
                .Where(b => b.UserId == userId)
                .Get();

            var dtos = response.Models.Select(b => new LocationBookmarkDto
            {
                Id = b.Id,
                UserId = b.UserId,
                Name = b.Name,
                Notes = b.Notes,
                Lat = b.Lat,
                Lng = b.Lng,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt
            });

            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching bookmarks");
            return StatusCode(500, new { error = "Failed to fetch bookmarks" });
        }
    }

    // GET: api/bookmarks/5
    [HttpGet("{id}")]
    public async Task<ActionResult<LocationBookmarkDto>> GetBookmark(long id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
            var response = await _supabase
                .From<LocationBookmark>()
                .Where(b => b.Id == id)
                .Where(b => b.UserId == userId)
                .Single();

            if (response == null)
            {
                return NotFound(new { error = "Bookmark not found" });
            }

            var dto = new LocationBookmarkDto
            {
                Id = response.Id,
                UserId = response.UserId,
                Name = response.Name,
                Notes = response.Notes,
                Lat = response.Lat,
                Lng = response.Lng,
                CreatedAt = response.CreatedAt,
                UpdatedAt = response.UpdatedAt
            };

            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching bookmark {BookmarkId}", id);
            return StatusCode(500, new { error = "Failed to fetch bookmark" });
        }
    }

    // POST: api/bookmarks
    [HttpPost]
    public async Task<ActionResult<LocationBookmarkDto>> CreateBookmark([FromBody] CreateBookmarkRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var bookmark = new LocationBookmark
            {
                UserId = userId,
                Name = request.Name,
                Notes = request.Notes,
                Lat = request.Lat,
                Lng = request.Lng
            };

            var response = await _supabase
                .From<LocationBookmark>()
                .Insert(bookmark);

            var createdBookmark = response.Models.FirstOrDefault();

            if (createdBookmark == null)
            {
                _logger.LogError("No bookmark returned from insert");
                return StatusCode(500, new { error = "Failed to create bookmark" });
            }

            var dto = new LocationBookmarkDto
            {
                Id = createdBookmark.Id,
                UserId = createdBookmark.UserId,
                Name = createdBookmark.Name,
                Notes = createdBookmark.Notes,
                Lat = createdBookmark.Lat,
                Lng = createdBookmark.Lng,
                CreatedAt = createdBookmark.CreatedAt,
                UpdatedAt = createdBookmark.UpdatedAt
            };

            _logger.LogInformation("Bookmark created successfully with ID: {Id}", dto.Id);
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating bookmark: {Message}", ex.Message);
            return StatusCode(500, new { error = "Failed to save bookmark. Please try again." });
        }
    }

    // PUT: api/bookmarks/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBookmark(long id, [FromBody] UpdateBookmarkRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var bookmark = new LocationBookmark
            {
                Id = id,
                UserId = userId,
                Name = request.Name,
                Notes = request.Notes,
                Lat = request.Lat,
                Lng = request.Lng,
                UpdatedAt = DateTime.UtcNow
            };

            var response = await _supabase
                .From<LocationBookmark>()
                .Update(bookmark);

            var updatedBookmark = response.Models.FirstOrDefault();

            if (updatedBookmark == null)
            {
                return NotFound(new { error = "Bookmark not found" });
            }

            var dto = new LocationBookmarkDto
            {
                Id = updatedBookmark.Id,
                UserId = updatedBookmark.UserId,
                Name = updatedBookmark.Name,
                Notes = updatedBookmark.Notes,
                Lat = updatedBookmark.Lat,
                Lng = updatedBookmark.Lng,
                CreatedAt = updatedBookmark.CreatedAt,
                UpdatedAt = updatedBookmark.UpdatedAt
            };

            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating bookmark {BookmarkId}", id);
            return StatusCode(500, new { error = "Failed to update bookmark" });
        }
    }

    // DELETE: api/bookmarks/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBookmark(long id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
            await _supabase
                .From<LocationBookmark>()
                .Where(b => b.Id == id)
                .Where(b => b.UserId == userId)
                .Delete();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting bookmark {BookmarkId}", id);
            return StatusCode(500, new { error = "Failed to delete bookmark" });
        }
    }
}
