def add(a, b):
    return a + b

import unittest

def add(a, b):
    return a + b

class TestAddFunction(unittest.TestCase):

    def test_add_positive_numbers(self):
        self.assertEqual(add(5, 7), 12)

    def test_add_negative_numbers(self):
        self.assertEqual(add(-5, -7), -12)

    def test_add_mixed_numbers(self):
        self.assertEqual(add(5, -7), -2)

    def test_add_zero(self):
        self.assertEqual(add(5, 0), 5)

    def test_add_floats(self):
        self.assertAlmostEqual(add(5.5, 7.7), 13.2)

if __name__ == '__main__':
    unittest.main()