class ToolRegistry:
    def __init__(self):
        self._tools = {}

    def register(self, name, schema, handler):
        self._tools[name] = {"schema": schema, "handler": handler}

    def get_schemas(self):
        """
        What we send to Ollama
        """
        tools = []
        for name, tool in self._tools.items():
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": name,
                        "description": tool["schema"]["description"],
                        "parameters": tool["schema"]["parameters"],
                    },
                }
            )
        return tools

    def get_handler(self, name):
        return self._tools[name]["handler"]
