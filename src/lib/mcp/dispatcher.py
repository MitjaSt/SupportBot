from loguru import logger


class ToolDispatcher:
    def __init__(self, registry):
        self.registry = registry

    def dispatch(self, tool_calls):
        for call in tool_calls:
            name = call["name"]
            args = call.get("arguments", {})

            handler = self.registry.get_handler(name)
            if handler is None:
                logger.warning(f"Unknown tool: {name}")
                continue

            # Validate required args for send_support_email
            if name == "send_support_email" and "phone_number" not in args:
                logger.warning(f"Tool {name} called without required phone_number - skipping")
                continue

            try:
                handler(**args)
            except TypeError as e:
                logger.error(f"Tool {name} failed with invalid arguments: {e}")
