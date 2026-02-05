"""
LangWatch Agent Simulations for Macular Society RAG system.

These tests simulate realistic user interactions to validate the RAG agent's
behavior before production deployment.

Run with: pytest tests/test_agent_simulations.py -v
"""

from datetime import datetime
from pathlib import Path

import pytest
import scenario
import yaml
from dotenv import load_dotenv
from qdrant_client import QdrantClient

from src.lib.llm import process_query

# Load environment variables (including OPENAI_API_KEY)
load_dotenv()

# Configure default model for simulations
scenario.configure(default_model="openai/gpt-4o")

# Cache directory for simulation results
CACHE_DIR = Path(".cache/agent_simulations")
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def save_simulation_result(
    name: str,
    result: scenario.ScenarioResult,
    description: str,
    rag_interactions: list[dict],
) -> Path:
    """Save simulation result to cache for review."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = name.lower().replace(" ", "_")
    filepath = CACHE_DIR / f"{timestamp}_{safe_name}.yaml"

    # Extract messages in a readable format
    messages = []
    for msg in result.messages:
        messages.append({
            "role": msg.get("role", "unknown"),
            "content": msg.get("content", ""),
        })

    output = {
        "name": name,
        "description": description,
        "timestamp": timestamp,
        "success": result.success,
        "reasoning": result.reasoning,
        "passed_criteria": result.passed_criteria,
        "failed_criteria": result.failed_criteria,
        "total_time": result.total_time,
        "agent_time": result.agent_time,
        "conversation": messages,
        "rag_interactions": rag_interactions,
    }

    # Use default_flow_style=False for readable multiline strings
    with open(filepath, "w") as f:
        yaml.dump(output, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    return filepath


class MacularRAGAgent(scenario.AgentAdapter):
    """Adapter wrapping the RAG system for LangWatch simulations."""

    def __init__(self):
        self.qdrant = QdrantClient(host="localhost", port=6333)
        self.interactions: list[dict] = []  # Store RAG interactions for logging

    async def call(self, input: scenario.AgentInput) -> scenario.AgentReturnTypes:
        # Get the latest user message
        user_message = input.last_new_user_message_str()
        if not user_message:
            return "I didn't receive a message. How can I help you?"

        # Call the RAG system
        result = process_query(user_message, self.qdrant, verbose=False)

        # Store interaction details for logging
        self.interactions.append({
            "user_query": user_message,
            "chunks_retrieved": result.get("chunks", []),
            "answer": result.get("answer", ""),
            "model": result.get("model", ""),
            "backend": result.get("backend", ""),
        })

        return result["answer"]


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_dry_amd_information():
    """Test that agent provides accurate information about dry AMD."""
    description = "An elderly person recently diagnosed with dry AMD wants to understand what dry AMD is and what treatment options exist."
    agent = MacularRAGAgent()
    result = await scenario.run(
        name="Dry AMD Information",
        description=description,
        agents=[
            agent,
            scenario.UserSimulatorAgent(
                system_prompt="You are an elderly person recently diagnosed with dry AMD. Ask questions to understand your condition and available treatments.",
            ),
            scenario.JudgeAgent(
                criteria=[
                    "Agent provides accurate information about dry AMD",
                    "Agent does not hallucinate or invent treatments",
                    "Agent suggests consulting an eye care professional",
                ],
            ),
        ],
        max_turns=5,
    )
    save_simulation_result("Dry AMD Information", result, description, agent.interactions)
    assert result.success, f"Scenario failed: {result.reasoning}"


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_wet_amd_treatment():
    """Test that agent explains wet AMD treatments correctly."""
    description = "A family member of someone with wet AMD wants to learn about anti-VEGF injections and other treatments."
    agent = MacularRAGAgent()
    result = await scenario.run(
        name="Wet AMD Treatment",
        description=description,
        agents=[
            agent,
            scenario.UserSimulatorAgent(
                system_prompt="You are a family member caring for someone with wet AMD. Ask about treatment options, especially injections.",
            ),
            scenario.JudgeAgent(
                criteria=[
                    "Agent mentions anti-VEGF treatments accurately",
                    "Agent provides information sourced from context",
                    "Agent does not make up specific drug names or dosages not in context",
                ],
            ),
        ],
        max_turns=5,
    )
    save_simulation_result("Wet AMD Treatment", result, description, agent.interactions)
    assert result.success, f"Scenario failed: {result.reasoning}"


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_out_of_scope_handling():
    """Test agent gracefully handles questions outside its knowledge."""
    description = "A confused caller asks about diabetes treatment, which is unrelated to macular degeneration."
    agent = MacularRAGAgent()
    result = await scenario.run(
        name="Out of Scope Question",
        description=description,
        agents=[
            agent,
            scenario.UserSimulatorAgent(
                system_prompt="You are confused and asking about diabetes treatment. Keep asking about diabetes, not eye conditions.",
            ),
            scenario.JudgeAgent(
                criteria=[
                    "Agent acknowledges it cannot help with unrelated topics",
                    "Agent does not provide false medical information",
                    "Agent offers to help with macular degeneration questions instead",
                ],
            ),
        ],
        max_turns=3,
    )
    save_simulation_result("Out of Scope Question", result, description, agent.interactions)
    assert result.success, f"Scenario failed: {result.reasoning}"


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_support_callback_flow():
    """Test that agent can handle support callback requests."""
    description = "An anxious patient prefers speaking to a human and wants to request a callback from the Macular Society."
    agent = MacularRAGAgent()
    result = await scenario.run(
        name="Support Callback Request",
        description=description,
        agents=[
            agent,
            scenario.UserSimulatorAgent(
                system_prompt="You are anxious and prefer speaking to a real person. Request a callback from the support team.",
            ),
            scenario.JudgeAgent(
                criteria=[
                    "Agent offers to arrange a callback or provides contact information",
                    "Agent is empathetic and understanding",
                    "Agent collects necessary contact details if initiating callback",
                ],
            ),
        ],
        max_turns=6,
    )
    save_simulation_result("Support Callback Request", result, description, agent.interactions)
    assert result.success, f"Scenario failed: {result.reasoning}"


@pytest.mark.agent_test
@pytest.mark.asyncio
async def test_low_vision_aids():
    """Test that agent provides helpful information about living with AMD."""
    description = "Someone struggling with daily tasks due to AMD vision loss wants to find out about magnifiers, lighting, and other aids."
    agent = MacularRAGAgent()
    result = await scenario.run(
        name="Low Vision Aids",
        description=description,
        agents=[
            agent,
            scenario.UserSimulatorAgent(
                system_prompt="You have AMD and struggle with daily tasks like reading. Ask about practical aids and tools that can help.",
            ),
            scenario.JudgeAgent(
                criteria=[
                    "Agent provides practical suggestions for managing low vision",
                    "Agent information is based on retrieved context",
                    "Agent is supportive and encouraging",
                ],
            ),
        ],
        max_turns=5,
    )
    save_simulation_result("Low Vision Aids", result, description, agent.interactions)
    assert result.success, f"Scenario failed: {result.reasoning}"
