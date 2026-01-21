"""
Callback flow state machine for collecting user information.
Manages multi-turn conversations to collect phone, name, and preferred time.
"""

import re

from loguru import logger

from src.lib.conversations.conversation_state import (
    CollectionState,
    ConversationSession,
    ConversationStateManager,
)


class CallbackFlowManager:
    def __init__(self, state_manager: ConversationStateManager):
        self.state_manager = state_manager

        # Keywords that trigger proactive callback offer
        self.complex_topics = [
            "treatment",
            "medication",
            "injection",
            "surgery",
            "diagnosis",
            "prognosis",
            "specialist",
            "referral",
            "appointment",
        ]

        # Keywords for reactive callback detection
        self.callback_keywords = [
            r"call\s+me",
            r"call\s+back",
            r"contact\s+me",
            r"reach\s+out",
            r"speak\s+to",
            r"talk\s+to",
            r"need\s+help",
            r"need\s+support",
        ]

    def should_offer_callback(
        self, query: str, chunks: list[str], session: ConversationSession
    ) -> bool:
        """
        Detect when to offer callback (proactive or reactive).

        Args:
            query: User's question
            chunks: Retrieved RAG chunks
            session: Current conversation session

        Returns:
            True if callback should be offered
        """
        # Don't offer if already in a collection flow
        if session.collection_state != CollectionState.IDLE.value:
            return False

        query_lower = query.lower()

        # Reactive: Explicit callback request
        for pattern in self.callback_keywords:
            if re.search(pattern, query_lower):
                logger.debug(f"Reactive callback trigger: {pattern}")
                return True

        # Proactive: Complex topics
        for topic in self.complex_topics:
            if topic in query_lower:
                logger.debug(f"Proactive callback trigger: complex topic '{topic}'")
                return True

        # Proactive: Low relevance scores (insufficient context)
        if chunks:
            # This is a heuristic - in real implementation you'd check actual scores
            # For now, we'll be conservative and not trigger on this
            pass

        return False

    def get_next_collection_prompt(self, session: ConversationSession) -> str | None:
        """
        Get the next prompt based on current collection state.

        Args:
            session: Current conversation session

        Returns:
            Prompt string or None if not in collection flow
        """
        state = session.collection_state

        if state == CollectionState.OFFERING.value:
            return "Would you like our support team to call you to discuss this further?"

        elif state == CollectionState.COLLECTING_USER_PHONE.value:
            return "What's your phone number?"

        elif state == CollectionState.COLLECTING_USER_NAME.value:
            return "May I have your name? (You can skip this if you prefer)"

        elif state == CollectionState.COLLECTING_USER_TIME.value:
            return "When would be a good time for them to call you? (e.g., morning, afternoon, or a specific time)"

        elif state == CollectionState.CONFIRMING.value:
            info_parts = [f"phone number {session.user_phone}"]
            if session.user_name:
                info_parts.append(f"name {session.user_name}")
            if session.preferred_call_time:
                info_parts.append(f"preferred time {session.preferred_call_time}")

            info_str = ", ".join(info_parts)
            return f"Just to confirm, I'll have our support team call you with this information: {info_str}. Is that correct?"

        return None

    def process_user_response(self, session: ConversationSession, user_input: str) -> dict:
        """
        Parse user response based on current state and extract data.

        Args:
            session: Current conversation session
            user_input: User's response

        Returns:
            Dict with {"action": "continue|complete|cancel", "extracted_data": {...}}
        """
        state = session.collection_state
        user_lower = user_input.lower().strip()

        # Handle cancellation at any point
        cancel_words = ["no", "cancel", "stop", "nevermind", "never mind", "no thanks"]
        if any(word in user_lower for word in cancel_words) and state not in [
            CollectionState.CONFIRMING.value
        ]:
            return {"action": "cancel", "extracted_data": {}}

        if state == CollectionState.OFFERING.value:
            # Check if user agrees
            yes_words = ["yes", "yeah", "sure", "okay", "ok", "please", "yep"]
            if any(word in user_lower for word in yes_words):
                return {"action": "continue", "extracted_data": {}}
            else:
                return {"action": "cancel", "extracted_data": {}}

        elif state == CollectionState.COLLECTING_USER_PHONE.value:
            # Extract phone number
            phone = self._extract_phone_number(user_input)
            if phone and self.validate_phone_number(phone):
                return {"action": "continue", "extracted_data": {"phone": phone}}
            else:
                return {
                    "action": "retry",
                    "extracted_data": {},
                    "error": "Invalid phone number format. Please provide a UK phone number.",
                }

        elif state == CollectionState.COLLECTING_USER_NAME.value:
            # Accept any non-empty response as name, or allow skip
            skip_words = ["skip", "no", "pass", "none"]
            if any(word == user_lower for word in skip_words):
                return {"action": "continue", "extracted_data": {}}
            elif len(user_input.strip()) > 0:
                return {"action": "continue", "extracted_data": {"name": user_input.strip()}}
            else:
                return {"action": "continue", "extracted_data": {}}

        elif state == CollectionState.COLLECTING_USER_TIME.value:
            # Accept any reasonable time description, or allow skip
            skip_words = ["skip", "no", "pass", "none", "anytime", "any time"]
            if any(word in user_lower for word in skip_words):
                return {"action": "continue", "extracted_data": {}}
            elif len(user_input.strip()) > 0:
                return {
                    "action": "continue",
                    "extracted_data": {"preferred_call_time": user_input.strip()},
                }
            else:
                return {"action": "continue", "extracted_data": {}}

        elif state == CollectionState.CONFIRMING.value:
            # Confirmation or correction
            yes_words = ["yes", "yeah", "correct", "right", "confirm", "yep", "ok", "okay"]
            if any(word in user_lower for word in yes_words):
                return {"action": "complete", "extracted_data": {}}
            else:
                # User wants to change something - restart from phone
                return {
                    "action": "restart",
                    "extracted_data": {},
                    "message": "No problem. Let's start over.",
                }

        return {"action": "continue", "extracted_data": {}}

    def _extract_phone_number(self, text: str) -> str | None:
        """
        Extract phone number from text using regex.

        Args:
            text: Input text

        Returns:
            Extracted phone number or None
        """
        # Remove common non-digit characters
        cleaned = re.sub(r"[^\d\s+()-]", "", text)

        # UK phone number patterns
        patterns = [
            r"(\+44\s?\d{4}\s?\d{6})",  # +44 1234 567890
            r"(0\d{4}\s?\d{6})",  # 01234 567890
            r"(0\d{3}\s?\d{3}\s?\d{4})",  # 0123 456 7890
            r"(\d{11})",  # 01234567890
            r"(\+44\d{10})",  # +441234567890
        ]

        for pattern in patterns:
            match = re.search(pattern, cleaned)
            if match:
                return match.group(1)

        return None

    def validate_phone_number(self, phone: str) -> bool:
        """
        Validate UK phone number format.

        Args:
            phone: Phone number string

        Returns:
            True if valid format
        """
        # Remove spaces, dashes, parentheses
        cleaned = re.sub(r"[\s\-()]", "", phone)

        # UK formats:
        # - Starts with 0 and has 10 digits: 0XXXXXXXXX
        # - Starts with +44 and has 10 digits: +44XXXXXXXXX
        # - Total 11 digits starting with 0
        # - Total 13 chars starting with +44

        if re.match(r"^0\d{10}$", cleaned):
            return True
        if re.match(r"^\+44\d{10}$", cleaned):
            return True

        return False

    def advance_state(self, session: ConversationSession, extracted_data: dict, action: str):
        """
        Advance state machine based on current state and action.

        Args:
            session: Current conversation session
            extracted_data: Data extracted from user response
            action: Action to take (continue, complete, cancel, restart, retry)
        """
        current_state = session.collection_state

        if action == "cancel":
            # Reset to IDLE
            self.state_manager.update_collection_state(session.session_id, CollectionState.IDLE)
            logger.debug(f"Callback collection cancelled for session {session.session_id}")

        elif action == "complete":
            # Mark as complete (tool will be called)
            self.state_manager.update_collection_state(session.session_id, CollectionState.COMPLETE)
            logger.debug(f"Callback collection completed for session {session.session_id}")

        elif action == "restart":
            # Go back to collecting phone
            self.state_manager.update_collection_state(
                session.session_id, CollectionState.COLLECTING_USER_PHONE
            )
            logger.debug(f"Restarting callback collection for session {session.session_id}")

        elif action == "retry":
            # Stay in current state (retry same question)
            logger.debug(f"Retrying current state for session {session.session_id}")

        elif action == "continue":
            # Advance to next state
            if current_state == CollectionState.OFFERING.value:
                self.state_manager.update_collection_state(
                    session.session_id, CollectionState.COLLECTING_USER_PHONE
                )

            elif current_state == CollectionState.COLLECTING_USER_PHONE.value:
                # Save phone and move to name
                if "phone" in extracted_data:
                    self.state_manager.update_user_info(
                        session.session_id, phone=extracted_data["phone"]
                    )
                self.state_manager.update_collection_state(
                    session.session_id, CollectionState.COLLECTING_USER_NAME
                )

            elif current_state == CollectionState.COLLECTING_USER_NAME.value:
                # Save name (if provided) and move to time
                if "name" in extracted_data:
                    self.state_manager.update_user_info(
                        session.session_id, name=extracted_data["name"]
                    )
                self.state_manager.update_collection_state(
                    session.session_id, CollectionState.COLLECTING_USER_TIME
                )

            elif current_state == CollectionState.COLLECTING_USER_TIME.value:
                # Save time (if provided) and move to confirming
                if "preferred_call_time" in extracted_data:
                    self.state_manager.update_user_info(
                        session.session_id,
                        preferred_call_time=extracted_data["preferred_call_time"],
                    )
                self.state_manager.update_collection_state(
                    session.session_id, CollectionState.CONFIRMING
                )

            logger.debug(
                f"Advanced state for session {session.session_id}: {current_state} -> {session.collection_state}"
            )
