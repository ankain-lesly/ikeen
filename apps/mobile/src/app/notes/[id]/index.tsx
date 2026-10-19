import { ActivityIndicator, View,  } from "react-native";
import { useLocalSearchParams,  } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import { useLiveNote } from "@/lib/queries/notes";
import { NoteEditor } from "@/components/notes/note-editor";
// import { useState } from "react";

// import Star from "@expo/material-symbols/star.xml";
// import Share from "@expo/material-symbols/share.xml";
// import MoreVert from "@expo/material-symbols/more_vert.xml";

export default function NoteDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: note } = useLiveNote(id);

  // const [isFavorite, setIsFavorite] = useState(false);

  if (!note) {
    return (
      <View className="flex-1 bg-background pt-safe pb-safe justify-center items-center">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // console.log({note: note?.id})

  return (
    <>
      {/* <Stack screenOptions={{ title: "My Note" }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          // Replace with your own icons
          // ios -> sf symbols only
          // icon="star.fill"
          // android -> material symbols only
          // icon={Star}
          icon={{}}
          // image={}
          // icon={
          //   isFavorite
          //     ? require("@/assets/images/tabIcons/home.png")
          //     : require("@/assets/images/tabIcons/home.png")
          // }
          onPress={() => setIsFavorite(!isFavorite)}
        />
        <Stack.Toolbar.Button
          // icon={require("@/assets/images/tabIcons/home.png")}
          // ios -> sf symbols only
          // icon="square.and.arrow.up"
          // android -> material symbols only
          icon={Share}
          onPress={() => Alert.alert("Share")}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          // icon={require("@/assets/images/tabIcons/home.png")}
          // ios -> sf symbols only
          // icon="ellipsis.circle"
          // android -> material symbols only
          icon={MoreVert}
          onPress={() => Alert.alert("Sidebar")}
        />
      </Stack.Toolbar> */}
      <NoteEditor key={note.id} note={note} />
    </>
  );
}
