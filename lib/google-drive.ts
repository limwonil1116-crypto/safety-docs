// lib/google-drive.ts
import { google } from "googleapis";
import { Readable } from "stream";

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });
  return oauth2Client;
}

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

async function getOrCreateSubFolder(drive: any, folderName: string, parentId: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  return folder.data.id!;
}

export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  subFolder?: string
): Promise<{ fileId: string; webViewLink: string; directUrl: string }> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  let targetFolderId = FOLDER_ID;
  if (subFolder) {
    targetFolderId = await getOrCreateSubFolder(drive, subFolder, FOLDER_ID);
  }

  const stream = Readable.from(buffer);
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId],
    },
    media: { mimeType, body: stream },
    fields: "id, webViewLink",
  });

  const fileId = response.data.id!;

  // 링크 있는 누구나 읽기 가능
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  const isImage = mimeType.startsWith("image/");
  const directUrl = isImage
    ? `https://drive.google.com/uc?export=view&id=${fileId}`
    : webViewLink;

  return { fileId, webViewLink, directUrl };
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  try {
    const auth = getAuth();
    const drive = google.drive({ version: "v3", auth });
    await drive.files.delete({ fileId });
  } catch (e) {
    console.error("Google Drive 삭제 실패 (무시):", e);
  }
}
