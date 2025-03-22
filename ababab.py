def maxUniqueSubstrings(s):
    seen = set()
    count = 0
    current_substring = ""

    for char in s:
        current_substring += char
        if current_substring in seen:
            count += 1
            seen.add(current_substring)
            current_substring = char  # Start new substring

    if current_substring:  # Count the last substring
        count += 1

    return count

# Example usage
s = "aditya"
print(maxUniqueSubstrings(s))  # Output: Maximum number of unique substrings
