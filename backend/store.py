from pydantic import BaseModel

class PromptSettings(BaseModel):
    learningGoal: str = ""
    outputDepth: str = "Default"
    pyqRecommendation: str = "No"
    realLifeApplication: str = "No"

    def update(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

prompt_settings_store = PromptSettings()