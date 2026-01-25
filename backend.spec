# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Resume Matcher Backend
Creates a standalone executable for FastAPI backend

To build:
  pyinstaller backend.spec
"""

import os
import sys
from pathlib import Path

# Get the project root - use SPECPATH which is always available
project_root = Path(SPECPATH) / 'apps' / 'backend'

block_cipher = None

a = Analysis(
    [str(project_root / 'app' / 'main.py')],
    pathex=[str(project_root)],
    binaries=[],
    datas=[
        (str(project_root / 'app' / 'prompts'), 'app/prompts'),
        (str(project_root / 'app' / 'routers'), 'app/routers'),
        (str(project_root / 'app' / 'services'), 'app/services'),
        (str(project_root / 'app' / 'schemas'), 'app/schemas'),
    ],
    hiddenimports=[
        'fastapi',
        'fastapi.routing',
        'fastapi.responses',
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'pydantic',
        'pydantic_settings',
        'pydantic.json_schema',
        'tinydb',
        'tinydb.storages',
        'litellm',
        'litellm.llms',
        'markitdown',
        'pdfminer',
        'pdfminer.six',
        'playwright',
        'python_docx',
        'docx',
        'dotenv',
        'python_dotenv',
        'httpx',
        'starlette',
        'starlette.middleware',
        'starlette.middleware.cors',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
