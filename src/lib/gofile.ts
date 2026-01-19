import { z } from "zod";

// GoFile API Response Types
export interface GoFileServer {
  status: string;
  data: {
    servers: Array<{
      name: string;
      zone: string;
    }>;
  };
}

export interface GoFileUploadResponse {
  status: string;
  data: {
    downloadPage: string;
    code?: string;
    parentFolderCode?: string;
    parentFolder: string;
    fileId: string;
    fileName: string;
    md5: string;
    guestToken?: string;
  };
}

export interface GoFileFolderResponse {
  status: string;
  data: {
    id: string;
    type: string;
    name: string;
    code: string;
    createTime: number;
    public: boolean;
    children?: Record<string, GoFileChild>;
  };
}

export interface GoFileChild {
  id: string;
  type: string;
  name: string;
  size?: number;
  downloadCount?: number;
  md5?: string;
  mimetype?: string;
  createTime: number;
  link?: string;
}

// Validation schemas
export const uploadOptionsSchema = z.object({
  password: z.string().min(4).max(32).optional(),
  expiration: z.enum(["never", "1", "7", "30", "90"]).optional(),
  description: z.string().max(500).optional(),
});

export type UploadOptions = z.infer<typeof uploadOptionsSchema>;

// Get best upload server
export async function getUploadServer(): Promise<string> {
  try {
    const response = await fetch("https://api.gofile.io/servers", {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`GoFile API server list unavailable (${response.status}), using fallback.`);
      return "store1";
    }

    const data = await response.json();

    if (data.status !== "ok") {
      console.warn(`GoFile API status: ${data.status}, using fallback.`);
      return "store1";
    }

    const servers = data.data?.servers || [];
    const allServers = data.data?.serversAllZone || [];
    const availableServer = servers[0]?.name || allServers[0]?.name;

    if (!availableServer) {
      console.warn("No servers found in GoFile response, using fallback.");
      return "store1";
    }

    return availableServer;
  } catch (error) {
    console.warn("Error getting upload server, using fallback:", error instanceof Error ? error.message : "Unknown error");
    return "store1";
  }
}

// Create a folder for organizing uploads
export async function createFolder(
  parentFolderId: string,
  folderName: string,
  token: string
): Promise<string | null> {
  try {
    const response = await fetch("https://api.gofile.io/contents/createFolder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        parentFolderId,
        folderName,
      }),
    });

    const data = await response.json();

    if (data.status === "ok") {
      return data.data.id;
    }

    return null;
  } catch (error) {
    console.error("Error creating folder:", error);
    return null;
  }
}

// Upload file to GoFile
export async function uploadToGoFile(
  file: File,
  server: string,
  token?: string,
  folderId?: string
): Promise<GoFileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (token) {
    formData.append("token", token);
  }

  if (folderId) {
    formData.append("folderId", folderId);
  }

  const response = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
    method: "POST",
    body: formData,
    // crucial: do not set Content-Type header manually for FormData
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Upload failed: ${response.status} ${text}`);
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  // console.log("GoFile Upload Response:", JSON.stringify(data, null, 2));

  if (data.status !== "ok") {
    throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  }

  return data as GoFileUploadResponse;
}

// Update folder settings (password, expiration, etc.)
export async function updateFolderSettings(
  folderId: string,
  token: string,
  options: {
    password?: string;
    expiration?: string;
    description?: string;
    public?: boolean;
  }
): Promise<boolean> {
  try {
    const updates: Promise<Response>[] = [];

    if (options.password) {
      updates.push(
        fetch(`https://api.gofile.io/contents/${folderId}/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            attribute: "password",
            attributeValue: options.password,
          }),
        })
      );
    }

    if (options.expiration && options.expiration !== "never") {
      const days = parseInt(options.expiration, 10);
      const expireTime = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;

      updates.push(
        fetch(`https://api.gofile.io/contents/${folderId}/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            attribute: "expiry",
            attributeValue: expireTime.toString(),
          }),
        })
      );
    }

    if (options.description) {
      updates.push(
        fetch(`https://api.gofile.io/contents/${folderId}/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            attribute: "description",
            attributeValue: options.description,
          }),
        })
      );
    }

    if (options.public !== undefined) {
      updates.push(
        fetch(`https://api.gofile.io/contents/${folderId}/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            attribute: "public",
            attributeValue: options.public.toString(),
          }),
        })
      );
    }

    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error("Error updating folder settings:", error);
    return false;
  }
}

// Get folder contents
export async function getFolderContents(
  folderId: string,
  token?: string
): Promise<GoFileFolderResponse | null> {
  try {
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `https://api.gofile.io/contents/${folderId}?wt=4fd6sg89d7s6`,
      { headers }
    );

    if (!response.ok) {
      return null;
    }

    const data: GoFileFolderResponse = await response.json();

    if (data.status !== "ok") {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting folder contents:", error);
    return null;
  }
}

// Get account root folder
export async function getAccountRootFolder(token: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.gofile.io/accounts/getid", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.status === "ok") {
      // Get account details to find root folder
      const accountResponse = await fetch(
        `https://api.gofile.io/accounts/${data.data.id}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      const accountData = await accountResponse.json();

      if (accountData.status === "ok") {
        return accountData.data.rootFolder;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting account root folder:", error);
    return null;
  }
}
