import yaml


# Custom YAML Dumper that uses block scalar style for multiline strings
class MultilineYamlDumper(yaml.SafeDumper):
    pass


def _str_representer(dumper: yaml.SafeDumper, data: str) -> yaml.ScalarNode:
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


MultilineYamlDumper.add_representer(str, _str_representer)
