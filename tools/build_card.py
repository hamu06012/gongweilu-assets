"""Keep PNG image chunks intact while updating both V2 and V3 card payloads."""
import argparse
import base64
import json
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_REF = "4a35beca57b2519846d448915f20c4e43603f8bd"
PORTRAITS = dict(zip(
    ["绿绮", "赵灵均", "白露", "宋玉轩", "宋婉清", "燕红", "柳如是", "苏墨", "叶长宁", "阮宜", "阿若", "春桃"],
    ["lvqi", "zhaolingjun", "bailu", "songyuxuan", "songwanqing", "yanhong", "liurushi", "sumo", "yechangning", "ruanyi", "aruo", "chuntao"],
))


def panel_source(embed_portraits=False):
    source = (ROOT / "src/panel.js").read_text(encoding="utf-8")
    urls = {name: f"https://cdn.jsdelivr.net/gh/hamu06012/gongweilu-assets@{ASSET_REF}/releases/2026-11-25/portrait-{slug}.webp"
            for name, slug in PORTRAITS.items()}
    if embed_portraits:
        urls = {name: 'data:image/webp;base64,' + base64.b64encode(
            (ROOT / f'releases/2026-11-25/portrait-{slug}.webp').read_bytes()).decode('ascii')
            for name, slug in PORTRAITS.items()}
    source, count = re.subn(r"const NPC_PORTRAITS = .*?;", "const NPC_PORTRAITS = " + json.dumps(urls, ensure_ascii=False) + ";", source, count=1)
    assert count == 1
    return source


def update_payload(payload, panel, schema):
    def replace_keys(value):
        if isinstance(value, str):
            return value.replace("{{user}}位置", "玩家位置")
        if isinstance(value, list):
            return [replace_keys(item) for item in value]
        if isinstance(value, dict):
            return {key.replace("{{user}}位置", "玩家位置"): replace_keys(item) for key, item in value.items()}
        return value
    updated = replace_keys(payload)
    data = updated.get("data", updated)
    scripts = data["extensions"]["tavern_helper"]["scripts"]
    schema_scripts = [s for s in scripts if "registerMvuSchema" in s.get("content", "")]
    panel_scripts = [s for s in scripts if "function findUserLocation" in s.get("content", "")]
    assert len(schema_scripts) == len(panel_scripts) == 1
    schema_scripts[0]["content"] = schema
    panel_scripts[0]["content"] = panel
    for entry in data["character_book"]["entries"]:
        if "变量更新规则:" in entry.get("content", ""):
            entry["content"] = entry["content"].replace(
                "  世界.玩家位置:\n    type: string\n    check:\n",
                "  世界.玩家位置:\n    type: string\n    check:\n"
                "      - 玩家位置字段固定为「世界.玩家位置」，不把用户名或宏写入键名，不创建第二个玩家位置字段。\n",
            )
    return updated


def chunk(kind, value):
    return struct.pack(">I", len(value)) + kind + value + struct.pack(">I", zlib.crc32(kind + value) & 0xFFFFFFFF)


def build_card(input_path, output_path, embed_portraits=False):
    source = Path(input_path).read_bytes()
    assert source[:8] == b"\x89PNG\r\n\x1a\n"
    result = bytearray(source[:8])
    pos, keys = 8, []
    panel = panel_source(embed_portraits)
    schema = (ROOT / "src/schema.js").read_text(encoding="utf-8")
    while pos < len(source):
        length = struct.unpack(">I", source[pos:pos + 4])[0]
        kind = source[pos + 4:pos + 8]
        value = source[pos + 8:pos + 8 + length]
        raw = source[pos:pos + 12 + length]
        if kind == b"tEXt" and value.split(b"\0", 1)[0] in (b"chara", b"ccv3"):
            key, encoded = value.split(b"\0", 1)
            original = json.loads(base64.b64decode(encoded))
            updated = update_payload(original, panel, schema)
            encoded = base64.b64encode(json.dumps(updated, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            raw = chunk(kind, key + b"\0" + encoded)
            keys.append(key)
        result.extend(raw)
        pos += 12 + length
    assert sorted(keys) == [b"ccv3", b"chara"], keys
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(result)
    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--embed-portraits", action="store_true", help="Use embedded portraits while repository upload is pending")
    args = parser.parse_args()
    print(build_card(args.input, args.output, args.embed_portraits))
