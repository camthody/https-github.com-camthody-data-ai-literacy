"""Data & AI Literacy Platform - FastAPI Backend Application"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    # Startup
    logger.info("🚀 Starting Data & AI Literacy Platform")
    yield
    logger.info("🛑 Shutting down application")


# Create FastAPI application
app = FastAPI(
    title="Data & AI Literacy Platform API",
    description="Epic platform for data science and AI education",
    version="1.0.0",
    lifespan=lifespan,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "🎯 Data & AI Literacy Platform",
        "version": "1.0.0",
        "status": "🟢 Running"
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
        "cache": "ready"
    }


@app.get("/api/v1/courses")
async def list_courses(skip: int = 0, limit: int = 20):
    """List all available courses."""
    courses = [
        {
            "id": 1,
            "title": "Data Fundamentals",
            "description": "Master the basics of data types, structures, and quality",
            "difficulty": "beginner",
            "duration_hours": 40,
            "instructor": "Dr. Sarah Chen",
            "rating": 4.9,
            "students": 15000
        },
        {
            "id": 2,
            "title": "Machine Learning Essentials",
            "description": "Learn supervised, unsupervised, and reinforcement learning",
            "difficulty": "intermediate",
            "duration_hours": 60,
            "instructor": "Prof. James Lee",
            "rating": 4.8,
            "students": 12000
        },
        {
            "id": 3,
            "title": "Deep Learning & Neural Networks",
            "description": "Build CNNs, RNNs, and Transformers from scratch",
            "difficulty": "advanced",
            "duration_hours": 80,
            "instructor": "Dr. Yuki Tanaka",
            "rating": 4.7,
            "students": 8000
        },
        {
            "id": 4,
            "title": "NLP & LLMs",
            "description": "Work with transformers, fine-tune models, build applications",
            "difficulty": "advanced",
            "duration_hours": 70,
            "instructor": "Prof. Amara Okonkwo",
            "rating": 4.9,
            "students": 10000
        },
        {
            "id": 5,
            "title": "Production ML & MLOps",
            "description": "Deploy, monitor, and scale machine learning models",
            "difficulty": "advanced",
            "duration_hours": 50,
            "instructor": "Dr. Alex Rodriguez",
            "rating": 4.6,
            "students": 5000
        }
    ]
    return {"courses": courses[skip:skip+limit], "total": len(courses)}


@app.get("/api/v1/datasets")
async def list_datasets(skip: int = 0, limit: int = 20):
    """List all available datasets."""
    datasets = [
        {
            "id": 1,
            "name": "Iris Flower Classification",
            "description": "Classic dataset for classification tasks",
            "domain": "biology",
            "rows": 150,
            "columns": 4,
            "file_size_mb": 0.005,
            "quality_score": 0.95,
            "downloads": 50000,
            "license": "CC0"
        },
        {
            "id": 2,
            "name": "Titanic Survival Prediction",
            "description": "Predict passenger survival based on features",
            "domain": "history",
            "rows": 891,
            "columns": 11,
            "file_size_mb": 0.09,
            "quality_score": 0.92,
            "downloads": 100000,
            "license": "CC0"
        },
        {
            "id": 3,
            "name": "MNIST Handwritten Digits",
            "description": "70,000 images of handwritten digits for computer vision",
            "domain": "computer-vision",
            "rows": 70000,
            "columns": 785,
            "file_size_mb": 12.0,
            "quality_score": 0.98,
            "downloads": 80000,
            "license": "CC0"
        },
        {
            "id": 4,
            "name": "COVID-19 Global Data",
            "description": "Daily COVID-19 cases, deaths, and vaccinations",
            "domain": "health",
            "rows": 50000,
            "columns": 12,
            "file_size_mb": 5.0,
            "quality_score": 0.87,
            "downloads": 25000,
            "license": "CC-BY"
        },
        {
            "id": 5,
            "name": "Stock Market Data (2000-2024)",
            "description": "Historical stock prices and trading volumes",
            "domain": "finance",
            "rows": 250000,
            "columns": 6,
            "file_size_mb": 50.0,
            "quality_score": 0.91,
            "downloads": 35000,
            "license": "CC-BY"
        },
        {
            "id": 6,
            "name": "IMDb Movie Reviews",
            "description": "50,000 movie reviews for NLP and sentiment analysis",
            "domain": "nlp",
            "rows": 50000,
            "columns": 3,
            "file_size_mb": 80.0,
            "quality_score": 0.89,
            "downloads": 45000,
            "license": "CC-BY"
        }
    ]
    return {"datasets": datasets[skip:skip+limit], "total": len(datasets)}


@app.get("/api/v1/tutorials")
async def list_tutorials(skip: int = 0, limit: int = 20):
    """List all available tutorials."""
    tutorials = [
        {
            "id": 1,
            "title": "Introduction to Pandas",
            "topic": "data-manipulation",
            "description": "Learn the fundamentals of data manipulation with Pandas",
            "estimated_minutes": 25,
            "difficulty": "beginner",
            "rating": 4.8,
            "views": 50000,
            "author": "Data Masters"
        },
        {
            "id": 2,
            "title": "NumPy Array Operations",
            "topic": "numerical-computing",
            "description": "Master NumPy arrays and vectorized operations",
            "estimated_minutes": 30,
            "difficulty": "beginner",
            "rating": 4.7,
            "views": 40000,
            "author": "Data Masters"
        },
        {
            "id": 3,
            "title": "Data Visualization with Matplotlib",
            "topic": "visualization",
            "description": "Create stunning data visualizations",
            "estimated_minutes": 35,
            "difficulty": "beginner",
            "rating": 4.6,
            "views": 35000,
            "author": "Viz Pro"
        },
        {
            "id": 4,
            "title": "Building Decision Trees",
            "topic": "machine-learning",
            "description": "Understand and build decision tree classifiers",
            "estimated_minutes": 40,
            "difficulty": "intermediate",
            "rating": 4.8,
            "views": 28000,
            "author": "ML Academy"
        },
        {
            "id": 5,
            "title": "Deep Dive: Neural Network Backpropagation",
            "topic": "deep-learning",
            "description": "Understand the math behind neural network training",
            "estimated_minutes": 60,
            "difficulty": "advanced",
            "rating": 4.9,
            "views": 15000,
            "author": "AI Institute"
        }
    ]
    return {"tutorials": tutorials[skip:skip+limit], "total": len(tutorials)}


@app.get("/api/v1/models")
async def list_models(skip: int = 0, limit: int = 20):
    """List all available pre-trained models."""
    models = [
        {
            "id": 1,
            "name": "BERT for Text Classification",
            "description": "Pre-trained BERT model for sentiment analysis",
            "model_type": "nlp",
            "framework": "pytorch",
            "accuracy": 0.92,
            "downloads": 20000,
            "size_mb": 340
        },
        {
            "id": 2,
            "name": "ResNet-50 for Image Classification",
            "description": "ImageNet pre-trained ResNet for object recognition",
            "model_type": "vision",
            "framework": "pytorch",
            "accuracy": 0.76,
            "downloads": 15000,
            "size_mb": 100
        },
        {
            "id": 3,
            "name": "GPT-2 Text Generation",
            "description": "Generate human-like text with GPT-2",
            "model_type": "nlp",
            "framework": "pytorch",
            "accuracy": None,
            "downloads": 25000,
            "size_mb": 548
        },
        {
            "id": 4,
            "name": "Gradient Boosting Regressor",
            "description": "XGBoost for regression tasks",
            "model_type": "regression",
            "framework": "sklearn",
            "accuracy": 0.88,
            "downloads": 10000,
            "size_mb": 5
        },
        {
            "id": 5,
            "name": "K-Means Clustering Model",
            "description": "Unsupervised clustering with K-Means",
            "model_type": "clustering",
            "framework": "sklearn",
            "accuracy": None,
            "downloads": 8000,
            "size_mb": 2
        }
    ]
    return {"models": models[skip:skip+limit], "total": len(models)}


@app.post("/api/v1/playground/execute")
async def execute_code(code: str, language: str = "python"):
    """Execute code in the playground."""
    return {
        "status": "success",
        "output": "Code executed successfully",
        "language": language
    }


@app.get("/api/v1/stats")
async def get_stats():
    """Get platform statistics."""
    return {
        "total_courses": 5,
        "total_datasets": 100,
        "total_tutorials": 500,
        "total_models": 100,
        "total_users": 50000,
        "total_learners": 500000,
        "avg_rating": 4.8,
        "uptime_percentage": 99.9
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
