import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('exporter', ROOT / 'scripts/export_map_data.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)

class ExportTests(unittest.TestCase):
    def test_geometry_grouping_and_repeatability(self):
        self.check_export('A27', 'elementary')

    def test_junior_high_geometry_and_isolation(self):
        self.check_export('A32', 'junior-high')

    def check_export(self, dataset, school_type):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp); source = base / 'source'; source.mkdir(); output = base / 'output'
            outer = [[139,35],[140,35],[140,36],[139,35]]
            hole = [[139.2,35.2],[139.3,35.3],[139.4,35.2],[139.2,35.2]]
            properties = {dataset + '_001':'13203',dataset + '_003':'test',dataset + '_004':'Test School',dataset + '_005':'武蔵野市1'}
            features = [{'type':'Feature','properties':properties,'geometry':{'type':'Polygon','coordinates':[outer,hole]}},
                        {'type':'Feature','properties':properties,'geometry':{'type':'MultiPolygon','coordinates':[[outer],[outer,hole]]}}]
            (source / (dataset + '-23_13.geojson')).write_text(json.dumps({'type':'FeatureCollection','features':features}))
            exporter.export(source, output, ['13'], 1000, ROOT, school_type)
            first = {p.relative_to(output):p.read_bytes() for p in output.rglob('*.json')}
            manifest = json.loads(first[Path('manifest.json')]); cities = json.loads(first[Path(manifest['prefectures'][0]['municipalities'])])['municipalities']
            records = json.loads(first[Path(cities[0]['schools'])])['schools']
            self.assertEqual(manifest['schoolType'], school_type)
            self.assertEqual(manifest['dataset'], dataset)
            with self.assertRaises(ValueError):
                exporter.export(source, output, ['13'], 1000, ROOT, 'elementary' if school_type == 'junior-high' else 'junior-high')
            self.assertEqual(len(records),1); self.assertNotIn('features',records[0])
            geometry = json.loads(first[Path(records[0]['boundary'])])['schools'][records[0]['id']]
            self.assertEqual(geometry,features)
            exporter.export(source, output, ['13'], 1000, ROOT, school_type)
            self.assertEqual(first,{p.relative_to(output):p.read_bytes() for p in output.rglob('*.json')})

if __name__ == '__main__': unittest.main()
