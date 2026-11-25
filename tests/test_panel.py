import json
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
STUB = """(() => {
  window.SillyTavern = {getContext: () => ({ name1: '萧景琰' })};
  window.Mvu = {getMvuData: () => ({stat_data: {
    世界: {'{{user}}位置':'养心殿', '萧景琰位置':'后山_废观', 当前时段:'巳时_日上三竿'},
    NPC: {绿绮:{位置:'养心殿',当前行为:'抚琴',人际关系:{}}}
  }})};
  window.waitGlobalInitialized = async () => window.Mvu;
  window.getChatMessages = async () => [];
  window.eventOn = () => {};
  window.toastr = {warning: () => {}, info: () => {}};
  window.$ = value => typeof value === 'function' ? value() : {on: () => {}};
})();"""


class PanelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1280, "height": 900})
        self.context.route('https://**', lambda route: route.abort())
        self.context.route('http://gwp.test/**', lambda route: route.fulfill(body='<html><body></body></html>', content_type='text/html'))
        self.context.add_init_script(STUB)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto('http://gwp.test/')
        self.page.evaluate((ROOT / 'src/panel.js').read_text(encoding='utf-8'))
        self.page.locator('#gwp-fab').click()
        self.page.locator('#gwp-panel.gwp-open').wait_for()
        self.page.wait_for_function("document.querySelector('.gwp-userloc')?.textContent.includes('后山_废观')")
        self.page.wait_for_timeout(300)

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.context.close()

    def zoom(self):
        for _ in range(8):
            self.page.locator('[data-map-zoom="in"]').click()

    def frame_info(self):
        return self.page.locator('.gwp-frame').evaluate('e => ({x:e.scrollLeft,y:e.scrollTop,w:e.clientWidth,h:e.clientHeight,sw:e.scrollWidth,sh:e.scrollHeight})')

    def drag(self, selector, dx, dy):
        box = self.page.locator(selector).bounding_box()
        x, y = box['x'] + box['width'] * .65, box['y'] + min(box['height'] * .6, 120)
        self.page.mouse.move(x, y)
        self.page.mouse.down()
        self.page.mouse.move(x + dx, y + dy, steps=8)
        self.page.mouse.up()

    def test_world_and_mouse_pan(self):
        self.assertIn('萧景琰所在', self.page.locator('.gwp-userloc').inner_text())
        self.zoom()
        before_panel = self.page.locator('#gwp-panel').bounding_box()
        self.drag('.gwp-frame', -110, -70)
        info = self.frame_info()
        self.assertGreater(info['x'], 80)
        self.assertGreater(info['y'], 45)
        self.assertEqual(before_panel, self.page.locator('#gwp-panel').bounding_box())
        self.page.locator('.gwp-refresh').click()
        self.assertGreater(self.frame_info()['x'], 80)
        self.page.locator('[data-map-zoom="fit"]').click()
        self.assertEqual(self.frame_info()['x'], 0)
        self.assertEqual(self.frame_info()['y'], 0)

    def test_marker_click_and_drag_does_not_click(self):
        self.page.locator('.gwp-marker[data-name="绿绮"]').click()
        self.assertTrue(self.page.locator('.gwp-npc.gwp-expanded[data-name="绿绮"]').is_visible())
        self.page.locator('[data-tab="map"]').click()
        self.zoom()
        self.page.locator('.gwp-marker[data-name="绿绮"]').scroll_into_view_if_needed()
        self.drag('.gwp-marker[data-name="绿绮"]', -60, -40)
        self.assertTrue(self.page.locator('[data-tab="map"]').evaluate("e=>e.classList.contains('gwp-active')"))
        self.page.locator('[data-map-zoom="fit"]').click()
        self.page.locator('.gwp-marker[data-name="绿绮"]').click()
        self.assertTrue(self.page.locator('[data-tab="list"]').evaluate("e=>e.classList.contains('gwp-active')"))

    def test_touch_pan_and_cancel(self):
        self.zoom()
        box = self.page.locator('.gwp-frame').bounding_box()
        x, y = box['x'] + 100, box['y'] + 100
        cdp = self.context.new_cdp_session(self.page)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        for d in [15, 35, 65]:
            cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':x-d,'y':y-d}]})
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        self.assertGreater(self.frame_info()['x'], 40)
        self.assertGreater(self.frame_info()['y'], 40)
        self.page.locator('.gwp-frame').dispatch_event('pointerdown', {'pointerId':77,'clientX':x,'clientY':y,'button':0,'isPrimary':True})
        self.page.locator('.gwp-frame').dispatch_event('pointercancel', {'pointerId':77})
        self.assertFalse(self.page.locator('.gwp-frame').evaluate("e=>e.classList.contains('gwp-panning')"))
        self.drag('.gwp-frame', -50, -35)
        self.assertGreater(self.frame_info()['x'], 80)

    def test_header_move_and_gallery(self):
        before = self.page.locator('#gwp-panel').bounding_box()
        self.drag('.gwp-header', -100, -55)
        after = self.page.locator('#gwp-panel').bounding_box()
        self.assertLess(after['x'], before['x'] - 70)
        self.page.locator('[data-tab="gallery"]').click()
        self.assertEqual(self.page.locator('.gwp-gallery-item').count(), 12)
        self.page.locator('.gwp-gallery-item[data-name="春桃"]').click()
        self.assertIn('/releases/2026-11-25/portrait-chuntao.webp', self.page.locator('.gwp-gallery-view img').get_attribute('src'))

    def test_parent_document_from_script_iframe(self):
        self.page.evaluate("""() => {
          const iframe = document.createElement('iframe');
          iframe.id = 'script-host'; iframe.style.display = 'none'; document.body.append(iframe);
        }""")
        iframe = self.page.frame_locator('#script-host')
        frame = self.page.frames[-1]
        frame.evaluate(STUB)
        frame.evaluate('delete window.SillyTavern')
        self.page.evaluate("document.querySelector('#gwp-root').remove(); document.querySelector('#gwp-style').remove()")
        frame.evaluate((ROOT / 'src/panel.js').read_text(encoding='utf-8'))
        self.page.locator('#gwp-fab').click()
        self.page.wait_for_function("document.querySelector('.gwp-userloc')?.textContent.includes('萧景琰')")
        self.page.wait_for_timeout(300)
        self.zoom()
        self.drag('.gwp-frame', -100, -65)
        self.assertGreater(self.frame_info()['x'], 70)
        self.assertGreater(self.frame_info()['y'], 40)


if __name__ == '__main__':
    unittest.main()
