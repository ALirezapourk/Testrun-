# Supabase Integration Setup for Map Bookmarks

## 🗄️ Database Setup

### Step 1: Create the Table in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/mwlkpdallhatwquzdffp
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-migration.sql`
5. Click **Run** to execute the SQL

This will create:
- `location_bookmarks` table with all necessary columns
- Indexes for performance
- Row Level Security policies (currently allows public access)

### Step 2: Verify the Table

1. In Supabase Dashboard, go to **Table Editor**
2. You should see `location_bookmarks` table
3. The table has these columns:
   - `id` (bigint, primary key)
   - `name` (text, required)
   - `notes` (text, optional)
   - `lat` (double precision)
   - `lng` (double precision)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

## ✅ What's Already Configured

The following has been set up in your application:

1. ✅ **Supabase Package** - Already installed (`Supabase` version 1.0.0)
2. ✅ **Environment Variables** - Already in `.env` file:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. ✅ **Backend API** - `BookmarksController.cs` created with endpoints:
   - `GET /api/bookmarks` - Get all bookmarks
   - `POST /api/bookmarks` - Create new bookmark
   - `GET /api/bookmarks/{id}` - Get single bookmark
   - `PUT /api/bookmarks/{id}` - Update bookmark
   - `DELETE /api/bookmarks/{id}` - Delete bookmark
   - `DELETE /api/bookmarks` - Delete all bookmarks
4. ✅ **Frontend JavaScript** - Updated to use API calls instead of localStorage
5. ✅ **Models** - Created LocationBookmark, CreateBookmarkRequest, UpdateBookmarkRequest

## 🚀 How to Run

1. **Create the database table** (see Step 1 above)
2. **Run the application**:
   ```bash
   dotnet run
   ```
3. **Test the bookmarks**:
   - Open the app in your browser
   - Right-click anywhere on the map
   - Create a bookmark with a name and notes
   - The bookmark is now saved to Supabase!

## 🔍 Verify Data in Supabase

1. Go to **Table Editor** in Supabase Dashboard
2. Click on `location_bookmarks` table
3. You should see your bookmarks stored there!

## 🔒 Security Notes

Currently, the table has public access enabled (anyone can read/write). 

**For production, you should:**
1. Enable authentication in your app
2. Update the RLS policies to restrict access to authenticated users only
3. Add user_id column to track who owns each bookmark

## 🎯 Features

- ✅ Create bookmarks with name and notes
- ✅ Edit existing bookmarks
- ✅ Delete individual bookmarks
- ✅ Delete all bookmarks
- ✅ View bookmarks on map with blue markers
- ✅ Get directions to bookmarks
- ✅ Data persists in Supabase cloud database
- ✅ LocalStorage backup for offline functionality

## 🐛 Troubleshooting

**If bookmarks don't save:**
1. Check browser console for errors
2. Verify Supabase table was created correctly
3. Check that SUPABASE_URL and SUPABASE_ANON_KEY are set in `.env`
4. Restart the application after creating the table

**If you see "Failed to fetch bookmarks":**
1. Make sure the `location_bookmarks` table exists
2. Verify RLS policies are set correctly
3. Check network tab in browser dev tools for API errors
