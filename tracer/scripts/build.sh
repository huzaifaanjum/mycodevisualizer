#!/usr/bin/env bash
# Builds tracer.jar with only the JDK (no Gradle/Maven download needed).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf build && mkdir -p build/classes
javac --release 21 -Xlint:all -Werror -d build/classes $(find src/main/java -name '*.java')
jar --create --file build/tracer.jar --main-class dev.mycodevisualizer.tracer.Main -C build/classes .
echo "Built tracer/build/tracer.jar"
