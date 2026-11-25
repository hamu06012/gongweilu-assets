import base64
import json
import struct
import sys
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools.build_card import build_card, PORTRAITS, ASSET_REF

INPUT = ROOT.parent / '锦瑟山庄-新角色立绘接入版.png'


def chunks(path):
    data = Path(path).read_bytes()
    pos = 8
    result = []
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        value = data[pos + 8:pos + 8 + length]
        crc = struct.unpack('>I', data[pos + 8 + length:pos + 12 + length])[0]
        assert crc == zlib.crc32(kind + value) & 0xFFFFFFFF
        result.append((kind, value))
        pos += 12 + length
    return result


@unittest.skipUnless(INPUT.exists(), 'Provide the original local PNG next to the repository')
class CardTests(unittest.TestCase):
    def test_export_preserves_artwork_and_lore(self):
        with tempfile.TemporaryDirectory() as temp:
            output = build_card(INPUT, Path(temp) / 'fixed.png')
            original, updated = chunks(INPUT), chunks(output)
            self.assertEqual([(k, v) for k, v in original if k != b'tEXt'],
                             [(k, v) for k, v in updated if k != b'tEXt'])
            payloads = {}
            for (kind, old), (_, new) in zip(original, updated):
                if kind != b'tEXt':
                    continue
                key, encoded = new.split(b'\0', 1)
                before = json.loads(base64.b64decode(old.split(b'\0', 1)[1]))
                after = json.loads(base64.b64decode(encoded))
                payloads[key] = after
                a, b = before['data'], after['data']
                for name in a:
                    if name not in ('extensions', 'character_book'):
                        self.assertEqual(a[name], b[name], name)
                for x, y in zip(a['character_book']['entries'], b['character_book']['entries']):
                    if x.get('id') not in [12, 16]:
                        self.assertEqual(x, y, x.get('comment'))
                for field in a['extensions']:
                    if field != 'tavern_helper':
                        self.assertEqual(a['extensions'][field], b['extensions'][field], field)
                scripts = b['extensions']['tavern_helper']['scripts']
                panel, schema = scripts[2]['content'], scripts[1]['content']
                self.assertIn('initMapPan(mapFrame, mapTip)', panel)
                self.assertIn('normalizePlayerWorld', schema)
                for slug in PORTRAITS.values():
                    self.assertIn(f'@{ASSET_REF}/releases/2026-11-25/portrait-{slug}.webp', panel)
                    self.assertTrue((ROOT / f'releases/2026-11-25/portrait-{slug}.webp').exists())
                for entry in b['character_book']['entries']:
                    self.assertNotIn('{{user}}位置', entry.get('content', ''))
            self.assertEqual(payloads[b'chara']['data'], payloads[b'ccv3']['data'])


if __name__ == '__main__':
    unittest.main()
