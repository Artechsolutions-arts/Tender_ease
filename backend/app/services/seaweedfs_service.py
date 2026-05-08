import logging
import requests
from app.core.config import SEAWEEDFS_MASTER_URL, SEAWEEDFS_PUBLIC_URL

logger = logging.getLogger("seaweedfs")


def upload_to_seaweed(file_bytes: bytes, filename: str, mime_type: str) -> tuple[str, str]:
    """
    Upload bytes to SeaweedFS.
    Returns (fid, public_url) — public_url is browser-accessible.
    Raises RuntimeError if SeaweedFS is unreachable or returns an error.
    """
    assign_resp = requests.post(f"{SEAWEEDFS_MASTER_URL}/dir/assign", timeout=5)
    assign_resp.raise_for_status()
    assign = assign_resp.json()

    fid: str = assign["fid"]
    # Use publicUrl so the host-side backend reaches the volume server even when
    # SeaweedFS runs inside Docker (assign["url"] is the Docker-internal hostname).
    volume_url: str = assign.get("publicUrl") or assign["url"]
    upload_url = f"http://{volume_url}/{fid}"

    put_resp = requests.post(
        upload_url,
        files={"file": (filename, file_bytes, mime_type)},
        timeout=30,
    )
    put_resp.raise_for_status()

    # Build the public URL using the configured public base so the browser can reach it
    public_url = f"{SEAWEEDFS_PUBLIC_URL.rstrip('/')}/{fid}"
    return fid, public_url


def delete_from_seaweed(fid: str) -> None:
    """Delete a file from SeaweedFS by fid. Silently ignores 404."""
    try:
        lookup_resp = requests.get(
            f"{SEAWEEDFS_MASTER_URL}/dir/lookup",
            params={"volumeId": fid.split(",")[0]},
            timeout=5,
        )
        lookup_resp.raise_for_status()
        locations = lookup_resp.json().get("locations", [])
        if not locations:
            return
        volume_url = locations[0]["url"]
        requests.delete(f"http://{volume_url}/{fid}", timeout=5)
    except Exception as exc:
        logger.error("SeaweedFS delete failed for fid=%s: %s", fid, exc)
