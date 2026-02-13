import { test, expect } from "bun:test";
import fc from "fast-check";
import { execSync, spawnSync } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, copyFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";

const SOURCE_SCRIPT_PATH = resolve(process.cwd(), "scripts/bump-version.sh");

function createTempRepo(initialVersion: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), "bump-version-test-"));
  mkdirSync(join(tempDir, "scripts"), { recursive: true });
  copyFileSync(SOURCE_SCRIPT_PATH, join(tempDir, "scripts", "bump-version.sh"));
  execSync("chmod +x scripts/bump-version.sh", { cwd: tempDir });

  execSync("git init", { cwd: tempDir });
  execSync("git config user.email 'test@example.com'", { cwd: tempDir });
  execSync("git config user.name 'Test User'", { cwd: tempDir });

  writeFileSync(join(tempDir, "package.json"), JSON.stringify({ version: initialVersion }, null, 2));
  writeFileSync(join(tempDir, "package-lock.json"), JSON.stringify({ version: initialVersion }, null, 2));
  execSync("git add .", { cwd: tempDir });
  execSync("git commit -m 'Initial commit'", { cwd: tempDir });

  return tempDir;
}

function runBumpScript(repoDir: string, input?: string) {
  const args = ["scripts/bump-version.sh"];
  if (input !== undefined) {
    args.push(input);
  }
  return spawnSync("bash", args, {
    cwd: repoDir,
    encoding: "utf8",
  });
}

// Helper functions that mirror the script's validation logic
function isValidBumpType(input: string): boolean {
  return /^(major|minor|patch)$/.test(input);
}

function isValidVersion(input: string): boolean {
  return /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$/.test(input);
}

function calculateBumpedVersion(currentVersion: string, bumpType: string): string {
  // Strip pre-release suffix for bump calculations
  const baseVersion = currentVersion.replace(/-.*$/, '');
  const [major, minor, patch] = baseVersion.split('.').map(Number);
  
  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

test("Feature: version-bump-script, Property 1: Input Validation - verify only valid bump types and semantic versions are accepted", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.oneof(
        // Valid bump types
        fc.constantFrom("major", "minor", "patch"),
        // Valid semantic versions
        fc.tuple(fc.nat(99), fc.nat(99), fc.nat(99)).map(([maj, min, pat]) => `${maj}.${min}.${pat}`),
        // Valid pre-release versions
        fc.tuple(
          fc.nat(99), 
          fc.nat(99), 
          fc.nat(99), 
          fc.string({ minLength: 1, maxLength: 10 }).map(s => s.replace(/[^a-zA-Z0-9.]/g, 'a'))
        ).map(([maj, min, pat, pre]) => `${maj}.${min}.${pat}-${pre}`),
        // Invalid inputs
        fc.string().filter(s => 
          !isValidBumpType(s) && !isValidVersion(s) && s !== ""
        )
      ),
      async (input) => {
        const shouldBeValid = isValidBumpType(input) || isValidVersion(input);

        const tempDir = createTempRepo("123.123.123");
        try {
          const result = runBumpScript(tempDir, input);

          if (shouldBeValid) {
            expect(result.status).toBe(0);
            expect(result.stdout).toContain("Version bumped to");
          } else {
            expect(result.status).not.toBe(0);
            expect(result.stderr).toContain("Invalid bump type or version");
          }
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ),
    { numRuns: 30 }
  );
}, 120000);

test("Feature: version-bump-script, Property 2: Version Calculation Correctness - verify correct calculation for each bump type", () => {
  fc.assert(
    fc.property(
      fc.tuple(fc.nat(99), fc.nat(99), fc.nat(99)),
      fc.constantFrom("major", "minor", "patch"),
      fc.option(fc.string({ minLength: 1, maxLength: 10 }).map(s => s.replace(/[^a-zA-Z0-9.]/g, 'a'))),
      ([major, minor, patch], bumpType, preRelease) => {
        const currentVersion = preRelease ? `${major}.${minor}.${patch}-${preRelease}` : `${major}.${minor}.${patch}`;
        
        const result = calculateBumpedVersion(currentVersion, bumpType);
        
        // Verify the result is a valid semantic version
        expect(isValidVersion(result)).toBe(true);
        
        // Verify the calculation is correct
        const [newMajor, newMinor, newPatch] = result.split('.').map(Number);
        
        switch (bumpType) {
          case "major":
            expect(newMajor).toBe(major + 1);
            expect(newMinor).toBe(0);
            expect(newPatch).toBe(0);
            break;
          case "minor":
            expect(newMajor).toBe(major);
            expect(newMinor).toBe(minor + 1);
            expect(newPatch).toBe(0);
            break;
          case "patch":
            expect(newMajor).toBe(major);
            expect(newMinor).toBe(minor);
            expect(newPatch).toBe(patch + 1);
            break;
        }
      }
    ),
    { numRuns: 100 }
  );
});

test("Feature: version-bump-script, Property 3: Precondition Checks - verify dirty working directory rejection", async () => {
  const tempDir = createTempRepo("1.0.0");
  
  try {
    writeFileSync(join(tempDir, "dirty-file.txt"), "uncommitted changes");
    const result = runBumpScript(tempDir, "patch");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Working directory is not clean");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
test("Feature: version-bump-script, Property 3: Version Extraction - verify version extraction works with various package.json formatting", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.tuple(fc.nat(99), fc.nat(99), fc.nat(99)),
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        description: fc.option(fc.string({ maxLength: 100 })),
        main: fc.option(fc.string({ maxLength: 50 })),
        scripts: fc.option(fc.dictionary(fc.string({ maxLength: 20 }), fc.string({ maxLength: 100 }))),
        dependencies: fc.option(fc.dictionary(fc.string({ maxLength: 20 }), fc.string({ maxLength: 20 })))
      }),
      fc.constantFrom(0, 2, 4), // indentation
      async ([major, minor, patch], extraFields, indent) => {
        const tempDir = mkdtempSync(join(tmpdir(), "version-extract-test-"));
        
        try {
          const version = `${major}.${minor}.${patch}`;
          const packageJson = { version, ...extraFields };
          
          writeFileSync(join(tempDir, "package.json"), JSON.stringify(packageJson, null, indent));
          
          // Extract version using grep/sed (same method as script)
          const extractedVersion = execSync(
            `grep '"version"' package.json | sed 's/.*"version": *"\\([^"]*\\)".*/\\1/'`,
            { cwd: tempDir, encoding: "utf8" }
          ).trim();
          
          expect(extractedVersion).toBe(version);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ),
    { numRuns: 100 }
  );
});

test("Feature: version-bump-script, Property 4: File Update Preservation - verify npm version preserves all other package.json fields", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.tuple(fc.nat(9), fc.nat(9), fc.nat(9)),
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 10 }),
        description: fc.option(fc.string({ maxLength: 20 }))
      }),
      fc.constantFrom("major", "minor", "patch"),
      async ([major, minor, patch], extraFields, bumpType) => {
        const tempDir = mkdtempSync(join(tmpdir(), "file-update-test-"));
        
        try {
          const originalVersion = `${major}.${minor}.${patch}`;
          const originalPackageJson = { version: originalVersion, ...extraFields };
          
          writeFileSync(join(tempDir, "package.json"), JSON.stringify(originalPackageJson, null, 2));
          
          // Update version using npm version (same as script)
          const expectedVersion = calculateBumpedVersion(originalVersion, bumpType);
          execSync(`npm version "${expectedVersion}" --no-git-tag-version`, { cwd: tempDir, stdio: "pipe" });
          
          const updatedContent = readFileSync(join(tempDir, "package.json"), "utf8");
          const updatedPackageJson = JSON.parse(updatedContent);
          
          // Verify version was updated
          expect(updatedPackageJson.version).toBe(expectedVersion);
          
          // Verify all other fields remain unchanged
          const { version: _, ...originalOtherFields } = originalPackageJson;
          const { version: __, ...updatedOtherFields } = updatedPackageJson;
          
          expect(updatedOtherFields).toEqual(originalOtherFields);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ),
    { numRuns: 20 }
  );
});

test("Feature: version-bump-script, Property 4: Precondition Checks - verify existing tag rejection logic", async () => {
  const tempDir = createTempRepo("1.0.0");
  
  try {
    execSync("git tag v1.0.1", { cwd: tempDir });
    const result = runBumpScript(tempDir, "1.0.1");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Tag 'v1.0.1' already exists");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Feature: version-bump-script, Property 5: Commit Message Format - verify commit message follows exact format 'chore: bump version to X.Y.Z'", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.tuple(fc.nat(99), fc.nat(99), fc.nat(99)),
      fc.constantFrom("major", "minor", "patch"),
      async ([major, minor, patch], bumpType) => {
        const currentVersion = `${major}.${minor}.${patch}`;
        const tempDir = createTempRepo(currentVersion);
        
        try {
          const expectedVersion = calculateBumpedVersion(currentVersion, bumpType);
          const result = runBumpScript(tempDir, bumpType);
          expect(result.status).toBe(0);
          const commitMessage = execSync("git log -1 --pretty=format:%s", { 
            cwd: tempDir, 
            encoding: "utf8" 
          }).trim();
          
          const expectedMessage = `chore: bump version to ${expectedVersion}`;
          expect(commitMessage).toBe(expectedMessage);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ),
    { numRuns: 20 }
  );
});

test("Feature: version-bump-script, Property 6: Tag Format - verify git tag is annotated tag with name 'vX.Y.Z'", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.tuple(fc.nat(99), fc.nat(99), fc.nat(99)),
      fc.constantFrom("major", "minor", "patch"),
      async ([major, minor, patch], bumpType) => {
        const currentVersion = `${major}.${minor}.${patch}`;
        const tempDir = createTempRepo(currentVersion);
        
        try {
          const expectedVersion = calculateBumpedVersion(currentVersion, bumpType);
          const expectedTag = `v${expectedVersion}`;
          const result = runBumpScript(tempDir, bumpType);
          expect(result.status).toBe(0);
          const tagExists = execSync(`git tag -l "${expectedTag}"`, { 
            cwd: tempDir, 
            encoding: "utf8" 
          }).trim();
          expect(tagExists).toBe(expectedTag);
          
          // Verify it's an annotated tag (points to tag object, not commit)
          const tagType = execSync(`git cat-file -t "${expectedTag}"`, { 
            cwd: tempDir, 
            encoding: "utf8" 
          }).trim();
          expect(tagType).toBe("tag"); // Annotated tags point to tag objects
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    ),
    { numRuns: 20 }
  );
});

test("No automatic push - verify script does not perform git push operation", async () => {
  const tempDir = createTempRepo("1.0.0");
  
  try {
    const result = runBumpScript(tempDir, "patch");
    expect(result.status).toBe(0);
    
    // Verify script suggests manual push but doesn't do it
    expect(result.stdout).toContain("To push: git push && git push --tags");
    expect(result.stdout).not.toContain("Pushed to remote");
    
    // Verify no remote tracking exists (would be set if push occurred)
    try {
      execSync("git rev-parse --abbrev-ref --symbolic-full-name @{u}", { 
        cwd: tempDir, 
        stdio: "pipe" 
      });
      expect.unreachable("Should not have upstream tracking");
    } catch (error: any) {
      expect(error.status).not.toBe(0); // Expected to fail
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});