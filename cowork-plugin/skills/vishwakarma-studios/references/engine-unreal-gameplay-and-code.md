# Unreal Engine: Gameplay Framework and Code Structure

Unreal is a shipped AAA game with the game removed. What you are licensing is not a rendering engine with scripting attached but an opinionated production stack: a gameplay framework that already knows what a player, a match and a session are, an authoritative network model that has run live services at scale, an artist-facing material and animation toolchain, console platform support with certification history, and full C++ source. The cost is that all of this is load-bearing and non-negotiable. You will build inside Unreal's abstractions or you will fight them, and the projects that fight them spend their schedule reimplementing systems the engine already provides, worse. Iteration is slower than C#-based engines, builds are measured in tens of minutes, the derived data pipeline requires infrastructure, and Perforce is effectively a prerequisite rather than a preference.

Version pinning throughout: UE 5.4 and 5.5 are the conservative production baselines, 5.6 where a specific feature requires it. Features marked experimental in these versions are flagged as such because their APIs change between minor releases.

## 1. The gameplay framework is the product

Unreal's class hierarchy encodes a specific model of a multiplayer session, and the model is correct often enough that adopting it wholesale is the right default even in single-player games. Learn where each piece lives on the network before writing any of it, because network location is what determines correctness.

| Class | Exists on | Lifetime | Holds |
|---|---|---|---|
| `AGameModeBase` | Server only | Whole match | Rules, spawning, win conditions, class selection |
| `AGameStateBase` | Server and all clients (replicated) | Whole match | Match state every client must see: score, phase, timer |
| `APlayerState` | Server and all clients (replicated) | Whole player session, survives pawn death | Player name, score, team, persistent per-player data |
| `APlayerController` | Server and the owning client only | Whole player session | Input, camera, client-authoritative UI, client RPC target |
| `APawn` / `ACharacter` | Server and relevant clients | Until death or possession change | The physical body, movement, animation |
| `AHUD` / `UUserWidget` | Owning client only | Client session | Presentation |
| `UGameInstance` | Client and server processes | Whole process, across level loads | Session-level services, subsystem host |

The three mistakes that follow from ignoring this table. Putting game rules in a `GameState` or an actor: `GameMode` exists only on the server, so anything you put elsewhere either replicates unnecessary authority to clients or silently does nothing on them. Storing player data on the `Pawn`: the pawn is destroyed on death, so score, loadout and team all vanish on respawn; that data belongs on `PlayerState`, which persists across possession. Reaching for a global singleton: `UGameInstanceSubsystem`, `UWorldSubsystem`, `ULocalPlayerSubsystem` and `UEngineSubsystem` give you lifetime-managed, automatically instantiated services with correct teardown and no static initialisation order problem, which is strictly better than the `static` pointer you were about to write.

The most common Unreal mistake, stated plainly: rebuilding an existing framework feature because the framework's version was not discovered. Before writing a system, check whether it exists as `Enhanced Input`, `Gameplay Ability System`, `Gameplay Tags`, `Data Registries`, `Common UI`, `Mass Entity`, `StateTree`, `Smart Objects`, or an engine subsystem. Studio: make framework survey a mandatory step in technical design review, with the reviewer's job being to name the engine feature the proposal duplicates.

The spawn and possession flow is worth knowing exactly, because most "my input does nothing on the client" bugs live in it. On login the server's `GameMode` runs `PostLogin`, spawns a `PlayerController`, spawns a default pawn via `SpawnDefaultPawnFor`, and calls `Possess`. Possession sets the pawn's `Controller`, replicates the owner relationship, and triggers `PossessedBy` on the server and `OnRep_Controller`/`NotifyControllerChanged` on clients. Input is bound on the controlled pawn or the controller through `SetupPlayerInputComponent`, which runs only where a local player exists — so input binding written on a simulated proxy runs nowhere. Enhanced Input (default from 5.1) layers Input Mapping Contexts, Input Actions, modifiers and triggers on top; contexts are pushed and popped with priorities through `UEnhancedInputLocalPlayerSubsystem`, which is how you get context-sensitive control schemes (on foot, in vehicle, in menu) without a state machine of `bool`s.

The Gameplay Ability System deserves a specific note because its adoption threshold is frequently misjudged. GAS gives you attributes with prediction-safe modification, gameplay effects with duration and stacking, tag-driven state, and client-side prediction with server reconciliation for abilities. It costs roughly two to six engineer-weeks to become productive in, and it is the correct choice for any action game with more than about a dozen abilities or any game where ability effects must be network-predicted. Below that threshold it is overhead.

## 2. Blueprint versus C++

Blueprint compiles to bytecode executed by a virtual machine inside `UObject::ProcessEvent`. The cost is per node and per function call, not per line of equivalent C++: a node dispatch is on the order of tens to a couple of hundred nanoseconds depending on node type, and a Blueprint function call has meaningful entry overhead for stack frame setup and parameter marshalling. In aggregate, tight numeric Blueprint code runs roughly 10–100x slower than the equivalent C++. That ratio is irrelevant for a door that opens once and decisive for a loop over 10,000 elements executed every frame.

Blueprint nativisation, which used to convert Blueprint graphs to generated C++, was deprecated in 4.27 and removed in UE 5.0. Do not plan around it. The performance model is what it is.

The decision rule, stated as a rule rather than a preference:

| Put in C++ | Put in Blueprint |
|---|---|
| Anything executing per frame over more than a handful of objects | Level scripting and one-off event responses |
| Anything executing per element over a collection | Designer-tunable values and curves |
| Core data structures, networking, save/load, subsystems | Cosmetic response: VFX spawning, audio triggering, UI wiring |
| Anything a programmer will need to debug in a shipping build | Animation state machine glue and Anim Blueprint event graphs |
| Anything requiring precise memory layout or replication control | Rapid prototyping before a system's shape is known |

The hybrid pattern is the one to standardise on. Write a C++ base class that owns state, replication and the expensive logic; expose tuning through `UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category=...)` and extension points through `BlueprintImplementableEvent` (no C++ body, Blueprint supplies it) or `BlueprintNativeEvent` (C++ default in `_Implementation`, Blueprint may override). Designers then derive a Blueprint from that class and work entirely in data and cosmetics.

```cpp
UCLASS(Abstract, Blueprintable)
class GAME_API AProjectile : public AActor {
    GENERATED_BODY()
public:
    UPROPERTY(EditDefaultsOnly, Category = "Ballistics")
    float MuzzleVelocity = 9000.f;                       // designer-tunable, no code

    UFUNCTION(BlueprintNativeEvent, Category = "Ballistics")
    void OnImpact(const FHitResult& Hit);                // C++ default, BP may extend
    void OnImpact_Implementation(const FHitResult& Hit); // authoritative logic lives here
};
```

The second, less discussed Blueprint cost is loading. A hard reference in a Blueprint graph or property pulls the referenced asset — and everything it references — into memory when the Blueprint loads. One careless reference from a frequently loaded Blueprint to a boss character can drag several hundred megabytes into the initial load set. Use `TSoftObjectPtr<T>` and `TSoftClassPtr<T>` with explicit async load for anything not needed immediately, and audit with the Reference Viewer and the Size Map before every milestone. Studio: add a size budget check to CI that fails when a designated Blueprint's loaded footprint exceeds its allowance.

Reference types and their loading consequences, which is the part that determines memory rather than performance:

| Declaration | Load behaviour | Use for |
|---|---|---|
| `UPROPERTY() UStaticMesh* Mesh` / `TObjectPtr` | Hard reference; loads with the owner | Small assets needed immediately and unconditionally |
| `TSoftObjectPtr<UStaticMesh>` | Path only; loads on explicit request | Anything large, conditional, or per-variant |
| `TSubclassOf<AActor>` | Hard class reference; loads the class and its dependencies | Small class sets known at load |
| `TSoftClassPtr<AActor>` | Path only | Spawnable content selected at runtime |
| `FPrimaryAssetId` + Asset Manager | Registry-driven, chunked, cook-aware | Content sets with DLC, patching or platform chunking |

Measure the result, do not assume it: the Size Map view reports the loaded footprint of an asset and everything it hard-references, and the Reference Viewer shows the graph that produced it. Both are editor tools that take seconds to use and routinely reveal a single soft-reference mistake holding hundreds of megabytes resident.

Blueprints are binary assets. Two people cannot merge one. This is a workflow constraint, not a technical one, and it is resolved by exclusive checkout in Perforce plus the discipline of keeping graphs small and pushing logic to C++.

## 3. Actor lifecycle and tick

Lifecycle order for a spawned actor: constructor (runs on the class default object at editor load as well as on instances — do not put gameplay logic there), `OnConstruction`/Construction Script (runs on placement and on every property edit in editor), `PostInitializeComponents`, `BeginPlay`, then ticking, then `EndPlay`, `Destroyed`, `BeginDestroy`, and eventual `FinishDestroy` when the garbage collector reclaims it. The trap is assuming `BeginPlay` ordering between actors is deterministic; it is not, and cross-actor initialisation should either use a subsystem that guarantees order or defer to the first tick.

| Stage | Runs on | Safe to do | Not safe to do |
|---|---|---|---|
| Constructor | CDO at editor load, and each instance | Create default subobjects, set defaults | Anything touching the world, other actors, or game state |
| `OnConstruction` / Construction Script | Editor placement and every property edit, and on spawn | Procedural setup from properties | Expensive work; it reruns on every property change |
| `PostInitializeComponents` | After components are registered | Component wiring, cached component pointers | Cross-actor lookups that assume spawn order |
| `BeginPlay` | Once, when play starts or on spawn | Gameplay initialisation | Assuming another actor's `BeginPlay` already ran |
| `Tick` | Per frame if enabled | Per-frame work you have justified | Anything the timer or event system could do |
| `EndPlay` / `Destroyed` | Deterministic teardown | Unregister, release handles | Assuming memory is freed here |
| `BeginDestroy` / `FinishDestroy` | GC time, non-deterministic | Release native resources | Touching other `UObject`s, which may already be gone |

Ticking is a task graph. Each ticking actor and component registers an `FTickFunction` with a tick group and a dependency list, and every frame the engine resolves and dispatches them. The per-actor overhead is not the body of `Tick` — it is registration, dependency resolution, prerequisite checking and dispatch, roughly 1–3 µs per ticking actor plus the same again per ticking component. Ten thousand ticking actors is several milliseconds of pure dispatch before any of your logic runs, on a 16.67 ms budget.

Therefore tick is off by default and enabled deliberately:

```cpp
AMyActor::AMyActor() {
    PrimaryActorTick.bCanEverTick = false;          // most actors
    // when a tick is genuinely needed but not every frame:
    // PrimaryActorTick.bStartWithTickEnabled = false;
    // PrimaryActorTick.TickInterval = 0.1f;        // 10 Hz, dispatch cost cut 6x at 60 fps
}
```

The alternatives, ordered by preference: event-driven logic (delegates, overlap events, `GameplayTag` change callbacks), `FTimerManager` timers for periodic work, a single manager actor ticking once and iterating its registered objects in a tight loop, and `Mass Entity` for genuinely large homogeneous populations (crowds, traffic, projectiles at 10⁴+). Mass is Unreal's ECS and its trade is the same as Unity's: linear cache-friendly iteration in exchange for giving up the actor framework's conveniences.

Tick groups exist to sequence work around physics: `TG_PrePhysics` (default; write forces here), `TG_StartPhysics`, `TG_DuringPhysics` (runs concurrently with the physics simulation — reading physics state here is a race), `TG_EndPhysics`, `TG_PostPhysics` (read post-simulation transforms here), `TG_PostUpdateWork` (cameras and anything that must observe everything else's final state). Placing camera logic in `TG_PrePhysics` and then wondering why the camera lags the character by one frame is the standard symptom of ignoring this.

## 4. UObject, reflection, and garbage collection

`UObject` is the reflected base type. Unreal Header Tool parses your headers for `UCLASS`, `USTRUCT`, `UPROPERTY`, `UFUNCTION` and `UENUM` macros and generates reflection data, serialisation, replication plumbing and Blueprint bindings. Reflection is what makes the editor, serialisation, networking and Blueprint interop work at all; the macros are not annotations, they are the mechanism.

Garbage collection is mark-and-sweep over the `UObject` graph, rooted at objects in the root set, reachable via reflected properties. This is the single most important consequence: **the collector can only see references it knows about, and it knows about references declared as `UPROPERTY`.**

```cpp
UPROPERTY()                       // tracked: keeps the object alive, nulled on destroy
TObjectPtr<UInventoryComponent> Inventory;

UInventoryComponent* RawCached;   // untracked: collector cannot see it
```

A raw, unreflected `UObject*` produces two failure modes. If nothing else references the object, it is collected while your pointer still holds the address — a dangling pointer that crashes at an arbitrary later time, typically far from the cause and typically only under memory pressure or after a level transition, which is why it survives testing and fails in certification. If something else does reference it, your code appears to work until the day that other reference goes away. `TObjectPtr<T>` (UE 5.0+) is the modern declaration form; it behaves as a raw pointer in shipping builds and adds access tracking in editor builds for lazy loading. For non-`UObject` classes that must hold references, implement `FGCObject::AddReferencedObjects` or use `TStrongObjectPtr<T>`. For deliberate non-owning references that should become null on destruction, use `TWeakObjectPtr<T>`.

| Holder | Correct reference type | Effect on GC |
|---|---|---|
| `UObject`-derived class | `UPROPERTY() TObjectPtr<T>` | Keeps alive, nulled on destroy |
| `UObject`-derived, non-owning | `UPROPERTY() TWeakObjectPtr<T>` | Does not keep alive, safely nulls |
| Plain C++ class or struct | `TStrongObjectPtr<T>` or `FGCObject` | Keeps alive; you own the lifetime |
| Container of objects | `UPROPERTY() TArray<TObjectPtr<T>>` | Each element traced |
| Deliberate global root | `AddToRoot` / `UGameInstance` member | Alive for process or instance lifetime |
| Asset not yet needed | `TSoftObjectPtr<T>` | No reference; nothing kept alive |

GC cost scales with `UObject` count, and a large project routinely holds 200k–2M `UObject`s. Full reachability analysis on that graph is 10–100 ms, which is a visible hitch. Mitigations in engine: incremental reachability analysis (UE 5.4+) spreads the mark phase across frames; GC clustering groups related objects so they are traced and destroyed as a unit; `gc.TimeBetweenPurgingPendingKillObjects` controls sweep cadence. Mitigations in your code: reduce object count (a `UObject` per item in a 50,000-item world is a design error — use `USTRUCT` in arrays, which are not GC-traced individually), avoid churning objects at runtime in favour of pooling, and measure with `obj list` and `stat memory`. Studio: track total `UObject` count as a tracked metric per milestone, in the same way as memory and frame time, because it grows silently and the hitch appears late.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. Session-scoped data is on `GameState` or `PlayerState`, not on `Pawn`; rules live in `GameMode`; no `static` gameplay singletons exist where an engine subsystem would serve.
2. Every `UObject*` member of a `UObject` is declared as a `UPROPERTY` (`TObjectPtr` or `TWeakObjectPtr`), verified by a static analysis or code review checklist item.
3. `PrimaryActorTick.bCanEverTick` is false in every actor constructor unless the actor has a documented per-frame need; a runtime count of ticking actors is tracked as a metric.
4. Camera and follow logic runs in `TG_PostUpdateWork`; nothing reads post-simulation physics state from `TG_DuringPhysics`.
5. The Blueprint-versus-C++ boundary is written down, and no Blueprint graph contains a per-frame loop over more than a handful of elements.
6. Large or conditional assets are referenced through `TSoftObjectPtr`/`TSoftClassPtr` or the Asset Manager, and each frequently loaded Blueprint has a Size Map footprint inside a documented budget.
7. Total `UObject` count is tracked per milestone alongside memory and frame time, and GC pause time on the target platform is inside a stated budget.
8. Input goes through Enhanced Input with mapping contexts, and control-scheme switching is driven by context priority rather than by branching on state flags.
