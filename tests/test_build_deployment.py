import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build_deployment.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class BuildTests(unittest.TestCase):
    def fixture(self, base):
        data = base / 'data'; data.mkdir()
        values = {
            'manifest.json': {'schemaVersion': 1, 'prefectures': [{'municipalities': 'cities.json'}]},
            'cities.json': {'municipalities': [{'schools': 'schools.json'}]},
            'schools.json': {'schools': [{'id': 'school', 'boundary': 'boundary.json'}]},
            'boundary.json': {'schools': {'school': [{'type': 'Feature', 'geometry': {'type': 'Polygon', 'coordinates': []}}]}},
            'orphan.json': {'unused': True}}
        for name, value in values.items(): (data / name).write_text(json.dumps(value))
        return data

    def test_allowlist_hashes_and_configuration(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp); data = self.fixture(base); out = base / 'dist'
            report = builder.build(out, data, {})
            self.assertFalse(report['configured'])
            about = (out / 'about.html').read_text()
            self.assertIn('./index.html', about)
            self.assertIn('./assets/style-', about)
            self.assertIn('2023年度', about)
            self.assertFalse((out / 'data/2023/orphan.json').exists())
            self.assertFalse((out / 'config.local.js').exists())
            self.assertFalse((out / 'map_data').exists())
            self.assertFalse((out / '.git').exists())
            html = (out / 'index.html').read_text()
            self.assertNotIn('config.local.js', html)
            self.assertNotIn('?v=', html)
            self.assertIn('./assets/lazySchoolData-', html)
            first = sorted(str(p.relative_to(out)) for p in out.rglob('*') if p.is_file())
            builder.build(out, data, {})
            self.assertEqual(first, sorted(str(p.relative_to(out)) for p in out.rglob('*') if p.is_file()))
            with self.assertRaises(ValueError): builder.build(out, data, {}, True)
            report = builder.build(out, data, {'apiKey': 'test-public-browser-key', 'mapId': 'test-map-id'}, True)
            self.assertTrue(report['configured'])
            self.assertIn('test-public-browser-key', (out / 'config.js').read_text())
            self.assertNotIn('test-public-browser-key', (out / builder.MARKER).read_text())

    def test_broken_and_unsafe_references(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp); data = self.fixture(base); out = base / 'dist'
            (data / 'schools.json').write_text(json.dumps({'schools': [{'id':'school','boundary':'../outside.json'}]}))
            with self.assertRaises(ValueError): builder.build(out, data, {})
            self.assertFalse(out.exists())
            (data / 'schools.json').write_text(json.dumps({'schools': [{'id':'absent','boundary':'boundary.json'}]}))
            with self.assertRaises(ValueError): builder.build(out, data, {})
            out.mkdir(); (out / 'keep.txt').write_text('user file')
            with self.assertRaises(ValueError): builder.build(out, data, {})
            self.assertTrue((out / 'keep.txt').exists())

if __name__ == '__main__': unittest.main()
