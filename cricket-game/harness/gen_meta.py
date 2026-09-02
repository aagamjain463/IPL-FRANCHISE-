#!/usr/bin/env python3
"""Generates deterministic .meta files for every asset under cricket-game/Assets.

Unity needs a .meta sidecar per file/folder; we pre-generate them with stable
GUIDs so the project opens cleanly and the hand-authored scene file can
reference the bootstrap script by GUID.
"""
import hashlib
import os

ASSETS = os.path.join(os.path.dirname(__file__), "..", "Assets")
ASSETS = os.path.abspath(ASSETS)

# Fixed GUIDs referenced by hand-authored YAML (scene -> bootstrap script).
FIXED_GUIDS = {
    "Assets/_Project/Presentation/Bootstrap/SuperOverBootstrap.cs":
        "aa10c2f4e6b84d0a9f3c5b7e8d2a4c61",
    "Assets/_Project/BattingPrototype/Bootstrap/BattingBootstrap.cs":
        "bb20c2f4e6b84d0a9f3c5b7e8d2a4c71",
    "Assets/_Project/Scenes/BattingPrototype.unity":
        "62a1b9c2d7b34e6f8a1c0d9b7e5f3b33",
}

META_TEMPLATES = {
    ".cs": """fileFormatVersion: 2
guid: {guid}
MonoImporter:
  externalObjects: {{}}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {{instanceID: 0}}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
""",
    ".unity": """fileFormatVersion: 2
guid: {guid}
DefaultImporter:
  externalObjects: {{}}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
""",
    ".asmdef": """fileFormatVersion: 2
guid: {guid}
AssemblyDefinitionImporter:
  externalObjects: {{}}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
""",
    "folder": """fileFormatVersion: 2
guid: {guid}
folderAsset: yes
DefaultImporter:
  externalObjects: {{}}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
""",
    "other": """fileFormatVersion: 2
guid: {guid}
DefaultImporter:
  externalObjects: {{}}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
""",
}


def stable_guid(rel_path: str) -> str:
    digest = hashlib.md5(("cricket-game/" + rel_path.replace(os.sep, "/")).encode()).hexdigest()
    return digest[:32]


def main():
    created = 0
    # Folders (top-down) then files.
    for root, dirs, files in os.walk(ASSETS):
        dirs[:] = sorted(d for d in dirs if d not in (".git",))
        rel_root = os.path.relpath(root, ASSETS)
        if rel_root != ".":
            rel = "Assets/" + rel_root.replace(os.sep, "/")
            meta = root + ".meta"
            if not os.path.exists(meta):
                guid = FIXED_GUIDS.get(rel + "/", stable_guid(rel + "/"))
                with open(meta, "w") as f:
                    f.write(META_TEMPLATES["folder"].format(guid=guid))
                created += 1
        for name in sorted(files):
            if name.endswith(".meta"):
                continue
            path = os.path.join(root, name)
            rel = os.path.relpath(path, os.path.dirname(ASSETS)).replace(os.sep, "/")
            meta = path + ".meta"
            if os.path.exists(meta):
                continue
            ext = os.path.splitext(name)[1].lower()
            template = META_TEMPLATES.get(ext, META_TEMPLATES["other"])
            guid = FIXED_GUIDS.get(rel, stable_guid(rel))
            with open(meta, "w") as f:
                f.write(template.format(guid=guid))
            created += 1
    print(f"created {created} meta files")


if __name__ == "__main__":
    main()
