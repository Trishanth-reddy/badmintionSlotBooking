import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const MyButton = ({ title, onPress, backgroundColor = "#959d90" }) => {
    return (
        <TouchableOpacity
            style={[styles.Button, { backgroundColor }]}
            onPress={onPress}
        >
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    Button: {
        backgroundColor: "#959d90",
        alignItems: "center",
        padding: 10,
        borderRadius: 8,
    },
    text: {
        fontSize: 18,
        color: "#efefe9",
        fontWeight: "bold",
    },
});

export default MyButton;
