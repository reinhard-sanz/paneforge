<script lang="ts">
	import { Pane, PaneGroup, PaneResizer } from "paneforge";
</script>

<div>
	<PaneGroup direction="horizontal" class="w-full">
		<Pane defaultSize={50}>
			<div class="bg-muted flex h-[400px] items-center justify-center rounded-lg">
				<div class="h-full overflow-auto p-6">
					Lorem ipsum dolor, sit amet consectetur adipisicing elit. Fuga quaerat eos,
					saepe doloribus facere fugiat! Magni consequatur a veniam quia. Exercitationem
					recusandae facilis cupiditate repellendus quaerat tenetur minima veniam quia!
					Lorem ipsum dolor sit amet consectetur adipisicing elit. Excepturi totam
					voluptates eveniet vel ab velit quas repudiandae quae possimus ad, eligendi
					commodi perspiciatis nisi tempora vitae ratione non! Praesentium, aliquam? Lorem
					ipsum dolor sit amet consectetur adipisicing elit. Mollitia fuga harum odit
					doloribus ea. Atque expedita repudiandae, provident suscipit dignissimos
					cupiditate itaque beatae debitis autem animi qui, quas aspernatur impedit!
				</div>
			</div>
		</Pane>
		<PaneResizer class="bg-background relative flex w-2 items-center justify-center" />
		<Pane defaultSize={50}>
			<PaneGroup direction="vertical">
				<Pane defaultSize={25}>
					<div class="bg-muted flex h-full items-center justify-center rounded-lg">
						<div class="h-full overflow-auto p-6">
							Lorem ipsum dolor, sit amet consectetur adipisicing elit. Fuga quaerat
							eos, saepe doloribus facere fugiat! Magni consequatur a veniam quia.
							Exercitationem recusandae facilis cupiditate repellendus quaerat tenetur
							minima veniam quia! Lorem ipsum dolor sit amet consectetur adipisicing
							elit. Excepturi totam voluptates eveniet vel ab velit quas repudiandae
							quae possimus ad, eligendi commodi perspiciatis nisi tempora vitae
							ratione non! Praesentium, aliquam? Lorem ipsum dolor sit amet
							consectetur adipisicing elit. Mollitia fuga harum odit doloribus ea.
							Atque expedita repudiandae, provident suscipit dignissimos cupiditate
							itaque beatae debitis autem animi qui, quas aspernatur impedit!
						</div>
					</div>
				</Pane>
				<PaneResizer class="bg-background relative flex h-2 items-center justify-center" />
				<Pane defaultSize={75}>
					<div class="bg-muted flex h-full items-center justify-center rounded-lg">
						<div class="h-full overflow-auto p-6">
							Lorem ipsum dolor, sit amet consectetur adipisicing elit. Fuga quaerat
							eos, saepe doloribus facere fugiat! Magni consequatur a veniam quia.
							Exercitationem recusandae facilis cupiditate repellendus quaerat tenetur
							minima veniam quia! Lorem ipsum dolor sit amet consectetur adipisicing
							elit. Excepturi totam voluptates eveniet vel ab velit quas repudiandae
							quae possimus ad, eligendi commodi perspiciatis nisi tempora vitae
							ratione non! Praesentium, aliquam? Lorem ipsum dolor sit amet
							consectetur adipisicing elit. Mollitia fuga harum odit doloribus ea.
							Atque expedita repudiandae, provident suscipit dignissimos cupiditate
							itaque beatae debitis autem animi qui, quas aspernatur impedit!
						</div>
					</div>
				</Pane>
			</PaneGroup>
		</Pane>
	</PaneGroup>
</div>
