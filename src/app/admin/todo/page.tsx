
  "use client";

import { useState, useEffect, useRef, FC } from "react";
import {
  DndContext,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableLinks from "@/components/SortableLinks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddNewItem } from "@/components/AddNewItem";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useRole } from "@/context/RoleContext"; // Correct import
import { supabase } from "@/utils/supabase/client";
import { AddNewList } from "@/components/AddNewList";
import { EditListTitle } from "@/components/EditListTitle";

// Define the item interface
interface Item {
  name: string;
  id: number;
  user_id: string;
  user_name: string;
  list_id: string;
}

// Define the list interface
interface List {
  id: string;
  title: string;
  items: Item[];
}

interface HomeProps {
  // You can add any additional props if needed
}

const Todo: React.FC<HomeProps> = () => {
  const { role, user } = useRole(); // Fetch role and user information from context
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [lists, setLists] = useState<List[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const [activeId, setActiveId] = useState<number | string | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [activeList, setActiveList] = useState<List | null>(null);

  useEffect(() => {
    const fetchLists = async () => {
      const { data: listData, error: listError } = await supabase
        .from("lists")
        .select("*");
      if (listError) {
        console.error("Error fetching lists:", listError);
      } else if (listData) {
        const { data: itemData, error: itemError } = await supabase
          .from("items")
          .select("*");
        if (itemError) {
          console.error("Error fetching items:", itemError);
        } else if (itemData) {
          const listsWithItems = listData.map((list: List) => ({
            ...list,
            items: itemData.filter((item: Item) => item.list_id === list.id),
          }));
          setLists(listsWithItems);
        }
      }
    };

    const fetchUsername = async () => {
      if (user) {
        const { data: userData, error } = await supabase
          .from("employees")
          .select("name")
          .eq("user_uuid", user.id)
          .single();
        if (userData) {
          setUsername(userData.name);
        } else {
          console.error("Error fetching username:", error?.message);
        }
      }
    };

    fetchLists();
    fetchUsername();

    if (!channel.current) {
      channel.current = supabase.channel("public:items");

      channel.current
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "items" },
          (payload) => {
            setLists((prevLists) =>
              prevLists.map((list) =>
                list.id === payload.new.list_id
                  ? { ...list, items: [...list.items, payload.new as Item] }
                  : list
              )
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "items" },
          (payload) => {
            setLists((prevLists) =>
              prevLists.map((list) =>
                list.id === payload.old.list_id
                  ? {
                      ...list,
                      items: list.items.filter(
                        (item) => item.id !== payload.old.id
                      ),
                    }
                  : list
              )
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "items" },
          (payload) => {
            setLists((prevLists) =>
              prevLists.map((list) =>
                list.id === payload.new.list_id
                  ? {
                      ...list,
                      items: list.items.map((item) =>
                        item.id === payload.new.id
                          ? (payload.new as Item)
                          : item
                      ),
                    }
                  : list
              )
            );
          }
        )
        .subscribe();
    }

    return () => {
      channel.current?.unsubscribe();
      channel.current = null;
    };
  }, [user]);

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);

    const activeList = lists.find((list) => list.id === active.id);
    if (activeList) {
      setActiveList(activeList);
    } else {
      const activeItem = lists
        .map((list) => list.items)
        .flat()
        .find((item) => item.id === active.id);
      setActiveItem(activeItem || null);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
  
    setActiveId(null);
    setActiveItem(null);
    setActiveList(null);
  
    if (!over) return;
  
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
  
    if (activeContainer && overContainer && activeContainer !== overContainer) {
      setLists((prevLists) => {
        const activeList = prevLists.find(
          (list) => list.id === activeContainer
        );
        const overList = prevLists.find((list) => list.id === overContainer);
        if (!activeList || !overList) return prevLists;
  
        const activeIndex = activeList.items.findIndex(
          (item) => item.id === active.id
        );
        const overIndex = overList.items.findIndex(
          (item) => item.id === over.id
        );
  
        if (activeIndex === -1 || overIndex === -1) return prevLists;
  
        const [movedItem] = activeList.items.splice(activeIndex, 1);
        overList.items.splice(overIndex, 0, movedItem);
  
        return prevLists.map((list) =>
          list.id === activeContainer
            ? { ...list, items: activeList.items }
            : list.id === overContainer
            ? { ...list, items: overList.items }
            : list
        );
      });
    } else if (activeContainer === overContainer) {
      setLists((prevLists) => {
        const activeList = prevLists.find(
          (list) => list.id === activeContainer
        );
        if (!activeList) return prevLists;
  
        const activeIndex = activeList.items.findIndex(
          (item) => item.id === active.id
        );
        const overIndex = activeList.items.findIndex(
          (item) => item.id === over.id
        );
  
        if (activeIndex !== -1 && overIndex !== -1) {
          const newItems = arrayMove(activeList.items, activeIndex, overIndex);
          return prevLists.map((list) =>
            list.id === activeContainer ? { ...list, items: newItems } : list
          );
        }
  
        return prevLists;
      });
    } else {
      const activeIndex = lists.findIndex((list) => list.id === active.id);
      const overIndex = lists.findIndex((list) => list.id === over.id);
  
      if (activeIndex !== -1 && overIndex !== -1) {
        setLists((prevLists) => arrayMove(prevLists, activeIndex, overIndex));
      }
    }
  };  

  const findContainer = (id: number | string): string | undefined => {
    for (const list of lists) {
      if (list.items.find((item) => item.id === id)) {
        return list.id;
      }
    }
    return lists.find((list) => list.id === id)?.id;
  };

  const handleDelete = async (listId: string, idToDelete: number) => {
    const list = lists.find((list) => list.id === listId);
    const item = list?.items.find((item) => item.id === idToDelete);
    if (item && item.user_id === user.id) {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", idToDelete);
      if (error) {
        console.error("Error deleting item:", error);
      } else {
        setLists((prevLists) =>
          prevLists.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: list.items.filter((item) => item.id !== idToDelete),
                }
              : list
          )
        );
      }
    } else {
      console.error("You do not have permission to delete this item.");
    }
  };

  const addNewItem = async (listId: string, newItem: string) => {
    if (!user || !username) {
      console.error("User or username is not defined");
      return;
    }

    const newItemData: Item = {
      name: newItem,
      id: Date.now(),
      user_id: user.id,
      user_name: username,
      list_id: listId,
    };
    const { data, error } = await supabase.from("items").insert([newItemData]);
    if (error) {
      console.error("Error adding item:", error);
    } else if (data) {
      setLists((prevLists) =>
        prevLists.map((list) =>
          list.id === listId
            ? { ...list, items: [...list.items, newItemData] }
            : list
        )
      );
    }
  };

  const addNewList = async (newListTitle: string) => {
    const newListData = {
      title: newListTitle,
    };
    const { data, error } = await supabase
      .from("lists")
      .insert([newListData])
      .select("id"); // Explicitly select the id

    if (error) {
      console.error("Error adding list:", error);
    } else if (data && data.length > 0) {
      const newList = { id: data[0].id, title: newListTitle, items: [] };
      setLists((prevLists) => [...prevLists, newList]);
    }
  };

  const updateListTitle = async (id: string, title: string) => {
    const { error } = await supabase
      .from("lists")
      .update({ title })
      .eq("id", id);
    if (error) {
      console.error("Error updating list title:", error);
    } else {
      setLists((prevLists) =>
        prevLists.map((list) => (list.id === id ? { ...list, title } : list))
      );
    }
  };

  const deleteList = async (id: string | number) => {
    const stringId = id.toString();
    const { error: listError } = await supabase
      .from("lists")
      .delete()
      .eq("id", stringId);
    const { error: itemsError } = await supabase
      .from("items")
      .delete()
      .eq("list_id", stringId);
    if (listError || itemsError) {
      console.error("Error deleting list:", listError || itemsError);
    } else {
      setLists((prevLists) => prevLists.filter((list) => list.id !== stringId));
    }
  };
  
  const updateItem = async (id: number, name: string) => {
    const { error } = await supabase
      .from("items")
      .update({ name })
      .eq("id", id);
    if (error) {
      console.error("Error updating item:", error);
    } else {
      setLists((prevLists) =>
        prevLists.map((list) => ({
          ...list,
          items: list.items.map((item) =>
            item.id === id ? { ...item, name } : item
          ),
        }))
      );
    }
  };

  return (
    <main className="flex grid cols-4 justify-center mt-10h-screen px-2 mx-auto select-none">
      <div className="flex justify-start p-4 mb-4">
        <AddNewList addNewList={addNewList} />
      </div>
      <div className="container mt-10 px-4 md:px-6">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3 md:grid-cols-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners} // Change this to closestCorners
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={lists.map((list) => list.id)} strategy={verticalListSortingStrategy}>
              {lists.map((list) => (
                <div key={list.id}>
                  <SortableLinks
                    item={list}
                    onDelete={deleteList}
                    updateItem={updateItem}
                    updateListTitle={updateListTitle}
                  />
                  <AddNewItem addNewItem={(newItem) => addNewItem(list.id, newItem)} />
                </div>
              ))}
            </SortableContext>
            <DragOverlay>
              {activeId && (
                <div>
                  {activeList ? (
                    <Card className="w-full min-w-[325px] md:max-w-lg">
                      <CardHeader className="space-y-1 ">
                        <CardTitle className="text-2xl flex justify-between">
                          {activeList.title}
                          <EditListTitle
                            list={activeList}
                            updateListTitle={updateListTitle}
                            deleteList={deleteList}
                          />
                        </CardTitle>
                        <CardDescription>List All Of Your Projects</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        {activeList.items.map((item) => (
                          <div key={item.id}>{item.name}</div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <div>{activeItem?.name}</div>
                  )}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </main>
  );
};

export default Todo;