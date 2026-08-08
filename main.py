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


app = FastAPI(title="Emotion Detection API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
    prediction = model.predict(text_tfidf)[0]

    return {
        "emotion": int(prediction)
    }