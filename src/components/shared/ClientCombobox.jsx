
import React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function ClientCombobox({ 
  clients, 
  value, 
  onChange, 
  placeholder = "Select a client...", 
  disabled = false,
  showAllOption = false,
  allOptionText = "All Clients",
  showNoneOption = true,
  noneOptionText = "No Client"
}) {
  const [open, setOpen] = React.useState(false);

  const selectedClientName = React.useMemo(() => {
    if (value === 'all' && showAllOption) return allOptionText;
    if ((value === null || value === 'none') && showNoneOption) return noneOptionText;
    const client = clients?.find(client => client.id === value);
    return client ? `${client.first_name} ${client.last_name}` : placeholder;
  }, [value, clients, placeholder, showAllOption, allOptionText, showNoneOption, noneOptionText]);

  const handleSelect = (selectedValue) => {
    if (selectedValue === 'none') {
      onChange(null);
    } else {
      onChange(selectedValue);
    }
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{selectedClientName}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search client..." />
          <CommandList>
            <CommandEmpty>No client found.</CommandEmpty>
            <CommandGroup>
              {showAllOption && (
                <CommandItem
                  value={allOptionText}
                  onSelect={() => handleSelect('all')}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === 'all' ? "opacity-100" : "opacity-0")} />
                  {allOptionText}
                </CommandItem>
              )}
              {showNoneOption && (
                <CommandItem
                  value={noneOptionText}
                  onSelect={() => handleSelect('none')}
                >
                  <Check className={cn("mr-2 h-4 w-4", (value === null || value === undefined || value === 'none') ? "opacity-100" : "opacity-0")} />
                  {noneOptionText}
                </CommandItem>
              )}
              {clients && clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.first_name} ${client.last_name} ${client.email || ''}`}
                  onSelect={() => handleSelect(client.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.first_name} {client.last_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
