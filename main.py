import joblib
import os

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


# Get the folder where main.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Full paths to the model files
MODEL_PATH = os.path.join(BASE_DIR, "logistic_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "tfidf_vectorizer.pkl")


# Load model and vectorizer
model = joblib.load(MODEL_PATH)
tfidf_vectorizer = joblib.load(VECTORIZER_PATH)

# Label index -> emotion name, based on order of first appearance in train.txt
EMOTION_LABELS = ["sadness", "anger", "love", "surprise", "fear", "joy"]


app = FastAPI(title="Emotion Detection API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


class EmotionInput(BaseModel):
    text: str


@app.get("/")
def home():
    return {
        "message": "Emotion Detection API is running!"
    }


@app.post("/predict")
def predict(data: EmotionInput):

    # Convert text into TF-IDF features
    text_tfidf = tfidf_vectorizer.transform([data.text])

    # Predict emotion
    prediction = int(model.predict(text_tfidf)[0])
    emotion_name = EMOTION_LABELS[prediction]

    # Confidence scores for every emotion (for richer frontend display)
    scores = {}
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(text_tfidf)[0]
        # probabilities[i] corresponds to model.classes_[i]
        for probability, class_index in zip(probabilities, model.classes_):
            scores[EMOTION_LABELS[int(class_index)]] = round(float(probability), 4)

    return {
        "emotion": emotion_name,
        "emotion_id": prediction,
        "scores": scores
    }
