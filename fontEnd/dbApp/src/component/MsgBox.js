import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const MsgBox = ({ title, content, onDelete }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.content}>{content}</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 10,
        marginVertical: 5,
        borderRadius: 5,
    },
    title: {
        fontWeight: "bold",
    },
    content: {
        marginTop: 5,
        color: "#555",
    },
    deleteButton: {
        marginTop: 10,
        padding: 5,
        backgroundColor: "#FF6347",
        borderRadius: 5,
        alignItems: "center",
    },
    deleteText: {
        color: "#fff",
        fontWeight: "bold",
    },
});

export default MsgBox;