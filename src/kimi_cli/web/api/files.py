"""Files API routes — simple file manager backend."""

from __future__ import annotations

import os
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile, status
from starlette.responses import FileResponse
from pydantic import BaseModel, Field

from kimi_cli.web.api.config import _ensure_sensitive_apis_allowed

router = APIRouter(prefix="/api/files", tags=["files"])


class ListResponse(BaseModel):
    path: str
    items: list[dict]


class ReadResponse(BaseModel):
    path: str
    content: str
    size: int


class WriteRequest(BaseModel):
    path: str = Field(description="Absolute file path")
    content: str = Field(description="File content")


class MkdirRequest(BaseModel):
    path: str = Field(description="Absolute directory path")


class DeleteRequest(BaseModel):
    path: str = Field(description="Absolute path to delete")
    recursive: bool = Field(default=False, description="Recursively delete directories")


class RenameRequest(BaseModel):
    old_path: str = Field(description="Current absolute path")
    new_path: str = Field(description="New absolute path")


@router.get("/list", summary="List directory contents")
async def list_dir(
    http_request: Request,
    path: str = Query("/", description="Absolute directory path"),
) -> ListResponse:
    _ensure_sensitive_apis_allowed(http_request)
    p = Path(path).resolve()
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")
    if not p.is_dir():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a directory")
    items = []
    for entry in p.iterdir():
        stat = entry.stat()
        items.append(
            {
                "name": entry.name,
                "path": str(entry),
                "is_dir": entry.is_dir(),
                "size": stat.st_size,
                "mtime": stat.st_mtime,
            }
        )
    items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
    return ListResponse(path=str(p), items=items)


@router.get("/read", summary="Read text file")
async def read_file(
    http_request: Request,
    path: str = Query(..., description="Absolute file path"),
) -> ReadResponse:
    _ensure_sensitive_apis_allowed(http_request)
    p = Path(path).resolve()
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    if p.stat().st_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (>5MB)")
    content = p.read_text(encoding="utf-8", errors="replace")
    return ReadResponse(path=str(p), content=content, size=p.stat().st_size)


@router.post("/write", summary="Write text file")
async def write_file(request: WriteRequest, http_request: Request) -> dict:
    _ensure_sensitive_apis_allowed(http_request)
    p = Path(request.path).resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(request.content, encoding="utf-8")
    return {"ok": True, "path": str(p)}


@router.post("/mkdir", summary="Create directory")
async def mkdir(request: MkdirRequest, http_request: Request) -> dict:
    _ensure_sensitive_apis_allowed(http_request)
    p = Path(request.path).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return {"ok": True, "path": str(p)}


@router.post("/delete", summary="Delete file or directory")
async def delete(request: DeleteRequest, http_request: Request) -> dict:
    _ensure_sensitive_apis_allowed(http_request)
    p = Path(request.path).resolve()
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")
    if p.is_dir():
        if request.recursive:
            shutil.rmtree(p)
        else:
            os.rmdir(p)
    else:
        p.unlink()
    return {"ok": True}


@router.post("/rename", summary="Rename file or directory")
async def rename(request: RenameRequest, http_request: Request) -> dict:
    _ensure_sensitive_apis_allowed(http_request)
    old = Path(request.old_path).resolve()
    new = Path(request.new_path).resolve()
    if not old.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    old.rename(new)
    return {"ok": True, "path": str(new)}


@router.post("/upload", summary="Upload file to directory")
async def upload_file(
    http_request: Request,
    path: str = Query(..., description="Target directory path"),
    file: UploadFile = File(...),
) -> dict:
    """Upload a file to the specified directory."""
    _ensure_sensitive_apis_allowed(http_request)
    target_dir = Path(path).resolve()
    if not target_dir.exists() or not target_dir.is_dir():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid directory")
    target = target_dir / (file.filename or "unnamed")
    content = await file.read()
    target.write_bytes(content)
    return {"ok": True, "path": str(target), "size": len(content)}


@router.get("/download", summary="Download file")
async def download_file(
    http_request: Request,
    path: str = Query(..., description="Absolute file path"),
) -> FileResponse:
    """Download a file with Content-Disposition: attachment."""
    _ensure_sensitive_apis_allowed(http_request)
    p = Path(path).resolve()
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(
        path=str(p),
        filename=p.name,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{p.name}"'},
    )
