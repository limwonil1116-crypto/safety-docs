// lib/google-drive.ts
import { google } from "googleapis";
import { Readable } from "stream";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
      private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    },
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  subFolder?: string
): Promise<{ fileId: string; webViewLink: string; webContentLink: string }> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  // 서브폴더가 있으면 해당 폴더 ID 찾거나 생성
  let targetFolderId = FOLDER_ID;
  if (subFolder) {
    targetFolderId = await getOrCreateSubFolder(drive, subFolder, FOLDER_ID);
  }

  // 파일 업로드
  const stream = Readable.from(buffer);
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink, webContentLink",
  });

  const fileId = response.data.id!;
  const webViewLink = response.data.webViewLink!;
  const webContentLink = response.data.webContentLink!;

  // 공개 읽기 권한 부여 (링크 있으면 누구나 볼 수 있게)
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return { fileId, webViewLink, webContentLink };
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

async function getOrCreateSubFolder(
  drive: any,
  folderName: string,
  parentId: string
): Promise<string> {
  // 기존 폴더 검색
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // 없으면 생성
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
