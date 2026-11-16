import unittest
import numpy as np
from engine import BM25, fuse
from evaluate import score

class RetrievalChecks(unittest.TestCase):
    def test_absent_words_zero(self):
        self.assertTrue(np.all(BM25(['plant resource','patent claim']).score('zzzzz')==0))

    def test_keyword_order(self):
        result=BM25(['plant resource','patent claim','unrelated text']).score('patent')
        self.assertEqual(int(np.argmax(result)),1)

    def test_rrf_ignores_zero_lexical_matches(self):
        result=fuse(np.zeros(3),np.array([0.2,0.9,0.4]))
        self.assertEqual(int(np.argmax(result)),1)
        self.assertAlmostEqual(result[1],1/61)

    def test_metric_boundaries(self):
        self.assertEqual(score(['wrong','right'],['right']),{'hit1':0,'hit3':1,'hit5':1,'rr5':0.5,'firstRelevantRank':2})
        self.assertEqual(score(['wrong'],['right'])['rr5'],0)

if __name__=='__main__':unittest.main()
