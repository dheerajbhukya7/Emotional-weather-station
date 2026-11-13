import unittest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError

model = MagicMock()
vectorizer = MagicMock()
with patch("joblib.load", side_effect=[model, vectorizer]):
    from main import EmotionInput, predict

class EmotionTests(unittest.TestCase):
    def test_invalid_text(self):
        for text in ("", "x" * 5001):
            with self.assertRaises(ValidationError):
                EmotionInput(text=text)

    def test_prediction_and_class_mapping(self):
        model.predict.return_value = [5]
        model.classes_ = [0, 5]
        model.predict_proba.return_value = [[0.1, 0.9]]
        response = predict(EmotionInput(text="I am happy"))
        self.assertEqual(response["emotion"], "joy")
        self.assertEqual(response["scores"], {"sadness": 0.1, "joy": 0.9})

if __name__ == "__main__":
    unittest.main()
