import unittest

from wheel_glitch_checker import WheelGlitchDetector


class WheelGlitchDetectorTests(unittest.TestCase):
    def test_opposite_tick_after_continuous_roll_is_suspicious(self):
        found = []
        detector = WheelGlitchDetector(max_gap=0.75, min_same_events=3, callback=found.append)
        for timestamp, direction in [(0.0, 1), (0.1, 1), (0.2, 1), (0.3, -1)]:
            result = detector.feed(direction, timestamp)

        self.assertIsNotNone(result)
        self.assertTrue(result.suspicious)
        self.assertEqual(len(found), 1)

    def test_slow_direction_change_is_not_suspicious(self):
        detector = WheelGlitchDetector(max_gap=0.75, min_same_events=3)
        for timestamp, direction in [(0.0, 1), (0.1, 1), (0.2, 1), (2.0, -1)]:
            result = detector.feed(direction, timestamp)

        self.assertIsNotNone(result)
        self.assertFalse(result.suspicious)

    def test_first_event_and_zero_are_ignored(self):
        detector = WheelGlitchDetector()
        self.assertIsNone(detector.feed(0, 0.0))
        self.assertIsNone(detector.feed(1, 0.1))


if __name__ == "__main__":
    unittest.main()
