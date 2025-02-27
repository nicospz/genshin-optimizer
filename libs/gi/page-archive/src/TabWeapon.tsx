import { useBoolState } from '@genshin-optimizer/common/react-util'
import { ColorText, ImgIcon, useInfScroll } from '@genshin-optimizer/common/ui'
import { handleMultiSelect } from '@genshin-optimizer/common/util'
import { imgAssets, weaponAsset } from '@genshin-optimizer/gi/assets'
import type { WeaponKey } from '@genshin-optimizer/gi/consts'
import { allWeaponKeys, allWeaponTypeKeys } from '@genshin-optimizer/gi/consts'
import type { ICachedWeapon } from '@genshin-optimizer/gi/db'
import { i18n } from '@genshin-optimizer/gi/i18n'
import { getWeaponSheet } from '@genshin-optimizer/gi/sheets'
import { getWeaponStat } from '@genshin-optimizer/gi/stats'
import { WeaponName } from '@genshin-optimizer/gi/ui'
import type { NodeDisplay } from '@genshin-optimizer/gi/uidata'
import {
  computeUIData,
  nodeVStr,
  resolveInfo,
} from '@genshin-optimizer/gi/uidata'
import { dataObjForWeapon, input } from '@genshin-optimizer/gi/wr'
import SearchIcon from '@mui/icons-material/Search'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import type { Palette } from '@mui/material'
import {
  Box,
  CardContent,
  InputAdornment,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Suspense, memo, useDeferredValue, useMemo, useState } from 'react'
import { WeaponView } from './WeaponView'
const rarities = [5, 4, 3, 2, 1] as const
export default function TabWeapon() {
  const [rarityFilter, setRarityFilter] = useState([...rarities])
  const [weaponTypeFilter, setWeaponTypeFilter] = useState([
    ...allWeaponTypeKeys,
  ])
  const handleRarity = handleMultiSelect([...rarities])
  const handleType = handleMultiSelect([...allWeaponTypeKeys])
  const [searchTerm, setSearchTerm] = useState('')
  const searchTermDeferred = useDeferredValue(searchTerm)
  const weaponKeys = useMemo(() => {
    return allWeaponKeys.filter(
      (wKey) => {
        const { rarity, weaponType } = getWeaponStat(wKey)
        if (!rarityFilter.includes(rarity)) return false
        if (!weaponTypeFilter.includes(weaponType)) return false
        const setKeyStr = i18n.t(`weaponNames_gen:${wKey}`)
        if (
          searchTermDeferred &&
          !setKeyStr
            .toLocaleLowerCase()
            .includes(searchTermDeferred.toLocaleLowerCase())
        )
          return false
        return true
      },
      [rarityFilter]
    )
  }, [rarityFilter, searchTermDeferred, weaponTypeFilter])
  const { numShow, setTriggerElement } = useInfScroll(10, weaponKeys.length)
  const weaponKeysToShow = useMemo(
    () => weaponKeys.slice(0, numShow),
    [weaponKeys, numShow]
  )
  return (
    <Box>
      <CardContent sx={{ display: 'flex', gap: 2 }}>
        <ToggleButtonGroup value={rarityFilter}>
          {rarities.map((r) => (
            <ToggleButton
              key={r}
              value={r}
              onClick={() => setRarityFilter((old) => handleRarity(old, r))}
            >
              <ColorText color={`rarity${r}` as keyof Palette}>
                <StarRoundedIcon sx={{ verticalAlign: 'text-top' }} />
              </ColorText>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <ToggleButtonGroup value={weaponTypeFilter}>
          {allWeaponTypeKeys.map((wt) => (
            <ToggleButton
              key={wt}
              value={wt}
              onClick={() => setWeaponTypeFilter((old) => handleType(old, wt))}
            >
              <ImgIcon src={imgAssets.weaponTypes?.[wt]} size={2} />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          fullWidth
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </CardContent>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Rarity</TableCell>
            <TableCell>Main</TableCell>
            <TableCell>Secondary</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {weaponKeysToShow.map((wKey) => (
            <WeaponRow key={wKey} weaponKey={wKey} />
          ))}
          {weaponKeys.length !== weaponKeysToShow.length && (
            <TableRow>
              <TableCell colSpan={5}>
                <Skeleton
                  ref={(node) => {
                    if (!node) return
                    setTriggerElement(node)
                  }}
                  sx={{ borderRadius: 1 }}
                  variant="rectangular"
                  width="100%"
                  height={50}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  )
}
const WeaponRow = memo(function WeaponRow({
  weaponKey: wKey,
}: {
  weaponKey: WeaponKey
}) {
  const [show, onShow, onHide] = useBoolState()
  const { rarity, weaponType } = getWeaponStat(wKey)
  const weapon = useMemo(
    () =>
      ({
        id: 'invalid',
        ascension: rarity > 2 ? 6 : 4,
        key: wKey,
        level: rarity > 2 ? 90 : 70,
        refinement: 1,
        location: '',
        lock: false,
      } as ICachedWeapon),
    [rarity, wKey]
  )
  const weaponUIData = useMemo(
    () => computeUIData([getWeaponSheet(wKey).data, dataObjForWeapon(weapon)]),
    [wKey, weapon]
  )
  const main = weaponUIData.get(input.weapon.main)
  const sub = weaponUIData.get(input.weapon.sub)
  return (
    <Suspense
      fallback={
        <TableRow>
          <TableCell colSpan={5}>
            <Skeleton
              sx={{ borderRadius: 1 }}
              variant="rectangular"
              width="100%"
              height={50}
            />
          </TableCell>
        </TableRow>
      }
    >
      <WeaponView
        show={show}
        weaponUIData={weaponUIData}
        weapon={weapon}
        onClose={onHide}
      />
      <TableRow hover onClick={onShow} sx={{ cursor: 'pointer' }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ImgIcon size={4} src={weaponAsset(wKey, true)} />
            <WeaponName weaponKey={wKey} />
          </Box>
        </TableCell>
        <TableCell>
          <ImgIcon
            src={imgAssets.weaponTypes?.[weaponType]}
            size={3}
            sideMargin
          />
        </TableCell>
        <TableCell>
          <Box display="flex">
            <ColorText color={`rarity${rarity}` as keyof Palette}>
              <StarRoundedIcon />
            </ColorText>
          </Box>
        </TableCell>
        <TableCell>
          <StatDisplay node={main} />
        </TableCell>
        <TableCell>
          <StatDisplay node={sub} />
        </TableCell>
      </TableRow>
    </Suspense>
  )
})
function StatDisplay({ node }: { node: NodeDisplay<number> }) {
  const { name, icon } = resolveInfo(node.info)
  if (Number.isNaN(node.value)) return null
  return (
    <Box sx={{ display: 'flex' }}>
      <Typography flexGrow={1}>
        {icon} {name}
      </Typography>
      <Typography>{nodeVStr(node)}</Typography>
    </Box>
  )
}
