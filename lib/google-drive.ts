// lib/google-drive.ts
import { google } from "googleapis";
import { Readable } from "stream";

// 서비스 계정이 소유한 폴더 ID (서비스 계정 드라이브에 생성)
const OWNER_EMAIL = process.env.GOOGLE_DRIVE_SHARE_EMAIL!; // 본인 gmail 주소

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
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

// 루트 폴더 가져오기 또는 생성 (서비스 계정 드라이브에)
async function getRootFolder(drive: any): Promise<string> {
  const folderName = "safety-docs-attachments";

  // 기존 폴더 검색
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // 없으면 생성
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  const folderId = folder.data.id!;

  // 본인 gmail에 편집자 권한 공유
  if (OWNER_EMAIL) {
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: OWNER_EMAIL,
        },
        sendNotificationEmail: false,
      });
    } catch (e) {
      console.error("폴더 공유 실패 (무시):", e);
    }
  }

  return folderId;
}

// 서브폴더 가져오기 또는 생성
async function getOrCreateSubFolder(
  drive: any,
  folderName: string,
  parentId: string
): Promise<string> {
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

  // 루트 폴더 확인/생성
  const rootFolderId = await getRootFolder(drive);

  // 서브폴더
  let targetFolderId = rootFolderId;
  if (subFolder) {
    targetFolderId = await getOrCreateSubFolder(drive, subFolder, rootFolderId);
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

  // 링크 있는 누구나 읽기 가능하게
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // 파일 정보 다시 가져오기
  const fileInfo = await drive.files.get({
    fileId,
    fields: "id, webViewLink, webContentLink",
  });

  const webViewLink = fileInfo.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
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
