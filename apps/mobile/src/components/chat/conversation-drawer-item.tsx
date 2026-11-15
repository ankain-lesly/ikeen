import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Trash2 } from "lucide-react-native"; 
import { OptionSheet, type SheetAction } from "@/components/ui/option-sheet";
import type { ChatConversationSummary } from "@repo/types";

export interface ConversationDrawerItemProps {
  conversation: ChatConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}

export function ConversationDrawerItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationDrawerItemProps) { 
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const actions: SheetAction[] = [
    {
      label: "Delete conversation",
      icon: <Trash2 size={18} color="#ef4444" />,
      color: "#ef4444",
      onPress: () => {
        setIsOptionsOpen(false);
        onDelete(conversation.id, conversation.title);
      },
    },
  ];

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onSelect(conversation.id)}
        onLongPress={() => setIsOptionsOpen(true)}
        className={`flex-row items-center py-2 px-3 rounded-xl gap-2.5 ${
          isActive
            ? ""
            : ""
        }`}>
        <View className="flex-1 min-w-0">
          <Text
            numberOfLines={1}
            className={`text-base ${
              isActive ? "font-semibold text-text-secondary" : "font-normal text-text"
            }`}>
            {conversation.title || "Untitled Chat"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Options Dropdown Sheet */}
      <OptionSheet
        isPresented={isOptionsOpen}
        onDismiss={() => setIsOptionsOpen(false)}
        // title={conversation.title || "Conversation"}
        actions={actions}
      />
    </>
  );
}
