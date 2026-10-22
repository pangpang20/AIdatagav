import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/validate-requirements.py'
SPEC = importlib.util.spec_from_file_location('delivery_validator', SCRIPT)
v = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(v)


class RequirementDeliveryTests(unittest.TestCase):
    def test_deployment_origin_rejected_without_echo(self):
        origin = 'http://' + 'www.' + 'audaqueproxy' + '.com' + ':10223'
        errors = v.deployment_errors(origin + '/module-login/login', 'fixture')
        self.assertTrue(errors)
        self.assertNotIn(origin, str(errors))
        self.assertEqual([], v.deployment_errors('/module-login/login', 'fixture'))

    def module(self):
        return {'code': 'DS', 'businessRequirements': [{'id': 'DS-100'}],
                'developmentReview': {'status': 'partial-ui-only', 'productionReady': False,
                'criticalDecisions': 'approval', 'objectBoundary': 'source',
                'expandedOperations': ['DS-100']}}

    def test_development_review_requires_every_registered_operation(self):
        text = '### DS-100 source\n**开发处理细则【拟定需求】**：\n- 输入与范围：current\n'
        self.assertEqual([], v.development_errors(text, self.module()))
        self.assertTrue(v.development_errors(text.replace('开发处理细则', 'details'), self.module()))
        m = self.module(); m['developmentReview']['expandedOperations'] = []
        self.assertTrue(v.development_errors(text, m))

    def test_partial_evidence_cannot_be_production_ready(self):
        m = self.module(); m['developmentReview']['productionReady'] = True
        self.assertTrue(v.development_errors('', m))

    def ai(self):
        record = {'id': 'AI-001', 'priority': 'P1', 'modules': ['DS'],
                  'acceptance': ['AI-AC-001'], 'status': 'proposed-unexecuted'}
        labels = ['业务目标与入口', '授权输入', '输出与依据', '操作流程', '采纳与写入边界',
                  '异常与恢复', '依赖与待确认']
        text = '### AI-001 mapping【拟定需求】\n\n'
        text += '\n'.join('**' + label + '**：specific proposal' for label in labels)
        text += '\n| AI-AC-001 | candidate | AI-001 | 【拟定，未执行】 |\n'
        return text, [record]

    def test_ai_registry_and_structure_match(self):
        text, records = self.ai()
        self.assertEqual([], v.ai_errors(text, records, {'DS'}))

    def test_ai_missing_input_or_unregistered_scenario_is_rejected(self):
        text, records = self.ai()
        self.assertTrue(v.ai_errors(text.replace('授权输入', 'input'), records, {'DS'}))
        self.assertTrue(v.ai_errors(text + '\n### AI-002 extra\n', records, {'DS'}))

    def test_ai_execution_and_unknown_modules_are_rejected(self):
        text, records = self.ai()
        self.assertTrue(v.ai_errors(text.replace('【拟定，未执行】', '【已执行】'), records, {'DS'}))
        self.assertTrue(v.ai_errors(text, records, {'HOME'}))

    def test_ai_acceptance_link_and_proposal_status_are_required(self):
        text, records = self.ai()
        self.assertTrue(v.ai_errors(text.replace('| AI-001 |', '| AI-999 |'), records, {'DS'}))
        records[0]['status'] = 'verified'
        self.assertTrue(v.ai_errors(text, records, {'DS'}))

    def test_preservation_only_accepts_origin_normalization(self):
        spec = importlib.util.spec_from_file_location('preservation_audit', SCRIPT.with_name('audit-requirement-preservation.py'))
        audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
        origin = 'http://' + 'www.' + 'audaqueproxy' + '.com' + ':10223'
        before = ('{"url":"' + origin + '/module-x","text":"sample"}').encode()
        after = b'{"url":"/module-x","text":"sample"}'
        self.assertTrue(audit.equivalent(before, after, '.json'))
        self.assertFalse(audit.equivalent(before, after.replace(b'sample', b'changed'), '.json'))
        self.assertFalse(audit.equivalent(b'original', b'changed', '.png'))
        self.assertTrue(audit.equivalent(b'original', b'original', '.png'))

    def test_user_menu_requires_observation_and_unexecuted_cases(self):
        record = {'requirements': ['UAC-001'], 'acceptance': ['UAC-AC-001']}
        text = '【页面观察】用户截图；目标页待确认\n'
        text += '\n'.join('## ' + str(i) + '. section' for i in range(1, 9))
        text += '\n### UAC-001 basic\n【拟定需求】scope\n'
        text += '| UAC-AC-001 | planned | UAC-001 | 【拟定，未执行】 |\n'
        self.assertEqual([], v.supplement_errors(text, record))
        self.assertTrue(v.supplement_errors(text.replace('【拟定，未执行】', '【已执行】'), record))
        self.assertTrue(v.supplement_errors(text.replace('UAC-001 |', 'UAC-999 |'), record))


if __name__ == '__main__':
    unittest.main()
