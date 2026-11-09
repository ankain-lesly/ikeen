import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import { useLiveNote } from "@/lib/queries/notes";
import { NoteEditor } from "@/components/notes/note-editor";
import { syncManager } from "@/lib/sync/sync-manager";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function NoteDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: note, updatedAt } = useLiveNote(id);
  const [syncDone, setSyncDone] = useState(false);

  useEffect(() => {
    if (!updatedAt || note || syncDone) return;

    if (useAuthStore.getState().isAuthenticated) {
      void syncManager.sync().finally(() => setSyncDone(true));
    }
  }, [updatedAt, syncDone, note]);

  console.log("CONTENT: ", note)
  
  if (note) {
    return <NoteEditor key={note.id} note={note} />;
  }


  return (
    <View className="flex-1 bg-background pt-safe pb-safe justify-center items-center px-4">
      {!syncDone ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View className="items-center gap-3">
          <Text className="text-sm font-medium text-text">Note not found</Text>
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(tabs)/notes")
            }
            className="px-3 py-1.5 rounded-lg bg-background-element border border-border active:opacity-70">
            <Text className="text-xs text-text">Go back</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// // console.log({note: note?.id})

// return (
//   <>
//     {/* <Stack screenOptions={{ title: "My Note" }} />
//     <Stack.Toolbar placement="right">
//       <Stack.Toolbar.Button
//         // Replace with your own icons
//         // ios -> sf symbols only
//         // icon="star.fill"
//         // android -> material symbols only
//         // icon={Star}
//         icon={{}}
//         // image={}
//         // icon={
//         //   isFavorite
//         //     ? require("@/assets/images/tabIcons/home.png")
//         //     : require("@/assets/images/tabIcons/home.png")
//         // }
//         onPress={() => setIsFavorite(!isFavorite)}
//       />
//       <Stack.Toolbar.Button
//         // icon={require("@/assets/images/tabIcons/home.png")}
//         // ios -> sf symbols only
//         // icon="square.and.arrow.up"
//         // android -> material symbols only
//         icon={Share}
//         onPress={() => Alert.alert("Share")}
//       />
//     </Stack.Toolbar>
//     <Stack.Toolbar placement="left">
//       <Stack.Toolbar.Button
//         // icon={require("@/assets/images/tabIcons/home.png")}
//         // ios -> sf symbols only
//         // icon="ellipsis.circle"
//         // android -> material symbols only
//         icon={MoreVert}
//         onPress={() => Alert.alert("Sidebar")}
//       />
//     </Stack.Toolbar> */}
//     <NoteEditor key={note.id} note={note} />
//   </>
// );
// }
