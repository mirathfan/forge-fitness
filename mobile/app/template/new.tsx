import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TemplateEditor } from "@/features/workouts/TemplateEditor";

export default function NewTemplateScreen() {
  return (
    <Screen>
      <Text variant="title">Create template</Text>
      <TemplateEditor />
    </Screen>
  );
}
