from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAgent(ABC):
    def __init__(self, user_credentials):
        self.user_credentials = user_credentials

    @abstractmethod
    def execute(self, slots: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's task based on the provided slots.
        Returns a dictionary with the result.
        """
        pass
