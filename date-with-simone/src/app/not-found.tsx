import { Frame } from "@/components/Frame";
import { StatusMessage } from "@/components/StatusMessage";

export default function NotFound() {
  return (
    <Frame>
      <StatusMessage
        title="Qui non c'è niente."
        body="Questa pagina non esiste. Se cercavi un invito, aprilo di nuovo dal link originale."
      />
    </Frame>
  );
}
