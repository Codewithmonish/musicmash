"""
How the AI service finds a performance's audio.

Contract (the only one): Spring stores every upload as ``<upload-dir>/<file name>`` and sends
the AI service just that file name, e.g. ``"3f2a9c1e-....wav"``. Both services point at the
same directory (Spring: ``file.upload-dir``; AI service: the ``UPLOAD_DIR`` setting).

The AI service never downloads URLs and never opens a path it was given directly: it accepts
a plain file name, joins it to UPLOAD_DIR, and refuses anything that ends up outside it.
"""
import re
from pathlib import Path

from app.core.config import settings

# Letters, digits, dot, underscore, hyphen; must not start with a dot. This rules out
# directories, drive letters, "..", URLs and hidden files in one check.
FILE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_-][A-Za-z0-9._-]{0,254}$")


class UploadPathError(ValueError):
    """The requested file is not a valid, existing upload."""


def is_valid_upload_name(file_name: str) -> bool:
    """True if ``file_name`` is a plain file name (no directories, drive or URL)."""
    return bool(FILE_NAME_PATTERN.match(file_name)) and ".." not in file_name


def upload_dir() -> Path:
    """The shared upload directory, as an absolute path."""
    return Path(settings.UPLOAD_DIR).resolve()


def resolve_upload(file_name: str) -> Path:
    """Map an upload file name to its absolute path inside UPLOAD_DIR.

    Raises UploadPathError if the name is not a plain file name, resolves outside the upload
    directory (e.g. through a symlink), or the file does not exist.
    """
    if not is_valid_upload_name(file_name):
        raise UploadPathError(f"'{file_name}' is not a plain upload file name.")
    root = upload_dir()
    path = (root / file_name).resolve()
    if not path.is_relative_to(root):
        raise UploadPathError(f"'{file_name}' is outside the upload directory.")
    if not path.is_file():
        raise UploadPathError(f"'{file_name}' was not found in the upload directory.")
    return path
