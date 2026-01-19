import { toast } from "sonner";

export interface DirectUploadResult {
  fileId: string;
  fileName: string;
  guestToken?: string;
  downloadPage: string;
  code: string;
  parentFolder: string;
  md5: string;
}

export async function uploadDirectly(
  file: File,
  server: string,
  token?: string,
  folderId?: string,
  onProgress?: (progress: number) => void
): Promise<DirectUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);
    if (token) formData.append("token", token);
    if (folderId) formData.append("folderId", folderId);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.status === "ok") {
            // Normalize response to match our interface
            const data = response.data;
            // Handle different API response structures (guest vs auth)
            resolve({
              fileId: data.fileId || data.id,
              fileName: data.fileName || data.name,
              guestToken: data.guestToken,
              downloadPage: data.downloadPage,
              code: data.code || data.parentFolderCode, // Crucial: prioritize parentFolderCode for links
              parentFolder: data.parentFolder,
              md5: data.md5
            });
          } else {
            reject(new Error(JSON.stringify(response)));
          }
        } catch (e) {
          reject(new Error("Invalid response format"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error occurred during upload"));
    });

    xhr.open("POST", `https://${server}.gofile.io/contents/uploadfile`);
    xhr.send(formData);
  });
}
