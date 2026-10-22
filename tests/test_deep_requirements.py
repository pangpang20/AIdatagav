import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('deep_builder', Path(__file__).resolve().parents[1]/'scripts/build-deep-requirements.py')
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class DeepRequirementsTests(unittest.TestCase):
    def test_failure_retains_previous_valid_source_and_does_not_invent_operation(self):
        groups = [{'code':'X', 'links':[
            {'name':'资源', 'evidence':'ok', 'status':'opened-review-content'},
            {'name':'资源', 'evidence':'empty', 'status':'opened-review-content',
             'operations':[{'name':'编辑', 'evidence':'empty'}]},
        ]}]
        samples = {'ok':{'id':'ok','text':'资源列表','headers':['名称']},
                   'empty':{'id':'empty','text':''}}
        obj = builder.collect(groups, samples)['X']['资源']
        self.assertEqual('ok', obj['source'])
        self.assertEqual({}, obj['operations'])
        self.assertEqual(2, len(obj['attempts']))

    def test_password_min_and_dynamic_options_do_not_become_business_rules(self):
        sample = {'forms':[{'label':'密码', 'requiredMarker':True, 'fields':[
            {'type':'password','min':'6','maxlength':'16','readonly':False,'disabled':False}]}]}
        row = builder.form_rows(sample)[0]
        self.assertIn('原始属性', row[3])
        self.assertNotIn('最短', row[3])
        self.assertEqual('页面星标', row[1])


if __name__ == '__main__':
    unittest.main()
