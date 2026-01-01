class ToolDispatcher:
    def __init__(self, registry):
        self.registry = registry

    def dispatch(self, tool_calls):
        for call in tool_calls:
            name = call["name"]
            args = call.get("arguments", {})

            handler = self.registry.get_handler(name)
            handler(**args)
