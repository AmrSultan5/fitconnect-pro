import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Image, Upload, Calendar, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProgressPhoto = Database["public"]["Tables"]["progress_photos"]["Row"];

export default function ProgressPhotos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDate, setUploadDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [uploadNotes, setUploadNotes] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: photosData, error } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("photo_date", { ascending: false });

    if (error) {
      console.error("Error fetching progress photos:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load progress photos",
      });
    } else if (photosData) {
      setPhotos(photosData);
      const urls: Record<string, string> = {};

      for (const photo of photosData) {
        const { data } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(photo.photo_url, 60 * 5); // 5 minutes

        if (data?.signedUrl) {
          urls[photo.id] = data.signedUrl;
        }
      }

      setSignedUrls(urls);
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchPhotos();
    }
  }, [user, fetchPhotos]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: "Please select an image file",
        });
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select an image smaller than 10MB",
        });
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!user || !uploadFile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a file to upload",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase Storage
      // Folder structure: progress-photos/{clientId}/{yyyy-mm-dd}/{filename}
      const fileExt = uploadFile.name.split(".").pop();
      const dateFolder = format(parseISO(uploadDate), "yyyy-MM-dd");
      const fileName = `${user.id}/${dateFolder}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("progress-photos")
        .upload(fileName, uploadFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      // ✅ Store ONLY the storage path
      const photoPath = fileName;


      // Insert record into database
      const { error: insertError } = await supabase.from("progress_photos").insert({
        user_id: user.id,
        photo_url: photoPath,
        photo_date: uploadDate,
        notes: uploadNotes || null,
      });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Progress photo uploaded successfully",
      });

      // Reset form
      setUploadFile(null);
      setUploadDate(format(new Date(), "yyyy-MM-dd"));
      setUploadNotes("");
      const fileInput = document.getElementById("photo-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Refresh photos
      fetchPhotos();
    } catch (error) {
      console.error("Error uploading photo:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload progress photo";
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: string, photoPath: string) => {
    if (!user) return;
  
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }
  
    try {
      // 1️⃣ Delete from storage (photoPath IS the correct path)
      const { error: storageError } = await supabase.storage
        .from("progress-photos")
        .remove([photoPath]);
  
      if (storageError) {
        throw storageError;
      }
  
      // 2️⃣ Delete DB record
      const { error: dbError } = await supabase
        .from("progress_photos")
        .delete()
        .eq("id", photoId)
        .eq("user_id", user.id);
  
      if (dbError) {
        throw dbError;
      }
  
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
  
      fetchPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete photo";
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: errorMessage,
      });
    }
  };  

  // Group photos by month
  const groupedPhotos = photos.reduce((acc, photo) => {
    const monthKey = format(parseISO(photo.photo_date), "MMMM yyyy");
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(photo);
    return acc;
  }, {} as Record<string, ProgressPhoto[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Progress Photos</h1>
          <p className="text-muted-foreground">Track your fitness journey with photos</p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Progress Photo
            </CardTitle>
            <CardDescription>Add a new photo to track your progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="photo-upload" className="block text-sm font-medium mb-2">
                Select Photo
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {uploadFile && (
                <p className="text-sm text-muted-foreground mt-2">Selected: {uploadFile.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="photo-date" className="block text-sm font-medium mb-2">
                Photo Date
              </label>
              <input
                id="photo-date"
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="photo-notes" className="block text-sm font-medium mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="photo-notes"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Add any notes about this photo..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <Button onClick={handleUpload} disabled={!uploadFile || isUploading}>
              {isUploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </CardContent>
        </Card>

        {/* Photos Gallery */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        ) : photos.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Image className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-muted-foreground">No progress photos yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload your first photo to start tracking your progress
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPhotos)
              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([month, monthPhotos]) => (
                <Card key={month}>
                  <CardHeader>
                    <CardTitle>{month}</CardTitle>
                    <CardDescription>{monthPhotos.length} photo{monthPhotos.length !== 1 ? "s" : ""}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {monthPhotos.map((photo) => (
                        <div key={photo.id} className="space-y-2">
                          <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                          <img
                              src={signedUrls[photo.id]}
                              alt={`Progress photo from ${format(parseISO(photo.photo_date), "MMM d, yyyy")}`}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={() => handleDelete(photo.id, photo.photo_url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(photo.photo_date), "MMM d, yyyy")}
                            </div>
                            {photo.notes && (
                              <p className="text-sm text-muted-foreground">{photo.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

